# Popstart Dev Server — zero-dependency backend for demos
# Usage: python3 server.py [port]
#
# Provides static file serving, a JSON key-value store, file uploads,
# Server-Sent Events, and WebSocket chat — all from the stdlib.

import sys, os, json, uuid, time, struct, hashlib, base64, tempfile, threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, unquote

# ── Shared state ─────────────────────────────────────────────────────────────

store_lock = threading.Lock()
STORE: dict[str, dict] = {}

upload_dir = tempfile.mkdtemp(prefix="popstart_uploads_")
upload_lock = threading.Lock()

sse_clients: list = []          # list of wfile objects
sse_lock = threading.Lock()

ws_clients: list = []           # list of socket objects
ws_lock = threading.Lock()

# ── Helpers ──────────────────────────────────────────────────────────────────

def broadcast_event(data: dict):
    """Push a JSON event to every SSE and WebSocket client."""
    payload = json.dumps(data)
    # SSE
    with sse_lock:
        dead = []
        for wfile in sse_clients:
            try:
                wfile.write(f"data: {payload}\n\n".encode())
                wfile.flush()
            except Exception:
                dead.append(wfile)
        for d in dead:
            sse_clients.remove(d)
    # WebSocket
    ws_send_all(payload)

def ws_send_frame(sock, text: str):
    data = text.encode()
    frame = bytearray([0x81])
    if len(data) < 126:
        frame.append(len(data))
    elif len(data) < 65536:
        frame.append(126)
        frame.extend(struct.pack("!H", len(data)))
    else:
        frame.append(127)
        frame.extend(struct.pack("!Q", len(data)))
    frame.extend(data)
    sock.sendall(bytes(frame))

def ws_send_all(text: str):
    with ws_lock:
        dead = []
        for sock in ws_clients:
            try:
                ws_send_frame(sock, text)
            except Exception:
                dead.append(sock)
        for d in dead:
            ws_clients.remove(d)

def ws_read_frame(sock):
    """Read one WebSocket frame. Returns (opcode, payload_bytes) or None."""
    hdr = sock.recv(2)
    if len(hdr) < 2:
        return None
    opcode = hdr[0] & 0x0F
    masked = bool(hdr[1] & 0x80)
    length = hdr[1] & 0x7F
    if length == 126:
        length = struct.unpack("!H", sock.recv(2))[0]
    elif length == 127:
        length = struct.unpack("!Q", sock.recv(8))[0]
    mask = sock.recv(4) if masked else b""
    raw = bytearray()
    while len(raw) < length:
        chunk = sock.recv(length - len(raw))
        if not chunk:
            return None
        raw.extend(chunk)
    if masked:
        raw = bytearray(b ^ mask[i % 4] for i, b in enumerate(raw))
    return opcode, bytes(raw)

def parse_multipart(content_type: str, body: bytes):
    """Minimal multipart/form-data parser. Returns (filename, file_bytes)."""
    boundary = content_type.split("boundary=")[1].strip()
    parts = body.split(f"--{boundary}".encode())
    for part in parts:
        if b"filename=" not in part:
            continue
        header, _, file_data = part.partition(b"\r\n\r\n")
        file_data = file_data.rstrip(b"\r\n--")
        header_str = header.decode(errors="replace")
        fname = header_str.split('filename="')[1].split('"')[0]
        return fname, file_data
    return None, None

# ── Request handler ──────────────────────────────────────────────────────────

class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write(f"\033[90m{self.address_string()} - {fmt % args}\033[0m\n")

    # ── CORS & OPTIONS ───────────────────────────────────────────────────
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Connection", "close")
        self.end_headers()
        self.close_connection = True

    # ── JSON response shorthand ──────────────────────────────────────────
    def json_response(self, obj, code=200):
        body = json.dumps(obj, indent=2).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(body)
        self.close_connection = True
        return True

    def read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length)

    # ── Routing ──────────────────────────────────────────────────────────
    def route(self, method: str):
        path = urlparse(self.path).path.rstrip("/")

        # --- Store CRUD ---
        if path == "/api/store" and method == "GET":
            with store_lock:
                return self.json_response(list(STORE.values()))

        if path == "/api/store" and method == "POST":
            obj = json.loads(self.read_body())
            obj.setdefault("id", str(uuid.uuid4()))
            with store_lock:
                STORE[obj["id"]] = obj
            broadcast_event({"type": "store", "action": "create", "data": obj})
            return self.json_response(obj, 201)

        if path.startswith("/api/store/") and method == "GET":
            key = path.split("/api/store/", 1)[1]
            with store_lock:
                obj = STORE.get(key)
            if obj:
                return self.json_response(obj)
            return self.json_response({"error": "not found"}, 404)

        if path.startswith("/api/store/") and method == "DELETE":
            key = path.split("/api/store/", 1)[1]
            with store_lock:
                removed = STORE.pop(key, None)
            if removed:
                broadcast_event({"type": "store", "action": "delete", "id": key})
                return self.json_response({"deleted": True})
            return self.json_response({"error": "not found"}, 404)

        # --- File uploads ---
        if path == "/api/upload" and method == "POST":
            ct = self.headers.get("Content-Type", "")
            fname, data = parse_multipart(ct, self.read_body())
            if not fname:
                return self.json_response({"error": "no file found"}, 400)
            safe = os.path.basename(fname)
            dest = os.path.join(upload_dir, safe)
            with upload_lock:
                with open(dest, "wb") as f:
                    f.write(data)
            return self.json_response({
                "filename": safe, "size": len(data),
                "path": dest, "url": f"/api/uploads/{safe}"
            }, 201)

        if path.startswith("/api/uploads/") and method == "GET":
            fname = unquote(path.split("/api/uploads/", 1)[1])
            fpath = os.path.join(upload_dir, os.path.basename(fname))
            if os.path.isfile(fpath):
                with open(fpath, "rb") as f:
                    data = f.read()
                self.send_response(200)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Connection", "close")
                self.end_headers()
                self.wfile.write(data)
                self.close_connection = True
                return True
            return self.json_response({"error": "not found"}, 404)

        # --- Broadcast ---
        if path == "/api/broadcast" and method == "POST":
            obj = json.loads(self.read_body())
            broadcast_event({"type": "broadcast", "message": obj.get("message", "")})
            return self.json_response({"ok": True})

        # --- SSE ---
        if path == "/api/sse" and method == "GET":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            with sse_lock:
                sse_clients.append(self.wfile)
            try:
                while True:
                    self.wfile.write(f"data: {json.dumps({'type':'heartbeat','t':int(time.time())})}\n\n".encode())
                    self.wfile.flush()
                    time.sleep(2)
            except Exception:
                pass
            finally:
                with sse_lock:
                    if self.wfile in sse_clients:
                        sse_clients.remove(self.wfile)
            return True

        # --- WebSocket upgrade ---
        if path == "/ws" and method == "GET":
            self.handle_websocket()
            return True

        return None  # not an API route

    def handle_websocket(self):
        key = self.headers.get("Sec-WebSocket-Key", "")
        magic = "258EAFA5-E914-47DA-95CA-5AB5DC65C97E"
        accept = base64.b64encode(hashlib.sha1((key + magic).encode()).digest()).decode()
        self.wfile.write(
            f"HTTP/1.1 101 Switching Protocols\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Accept: {accept}\r\n"
            f"Access-Control-Allow-Origin: *\r\n"
            f"\r\n".encode()
        )
        self.wfile.flush()
        sock = self.request
        with ws_lock:
            ws_clients.append(sock)
        try:
            while True:
                result = ws_read_frame(sock)
                if result is None:
                    break
                opcode, payload = result
                if opcode == 0x8:  # close
                    try:
                        sock.sendall(bytes([0x88, 0x00]))
                    except Exception:
                        pass
                    break
                if opcode == 0x9:  # ping → pong
                    pong = bytearray([0x8A, len(payload)])
                    pong.extend(payload)
                    sock.sendall(bytes(pong))
                    continue
                if opcode == 0xA:  # pong — ignore
                    continue
                if opcode == 0x1:  # text
                    text = payload.decode(errors="replace")
                    ws_send_all(text)
                    broadcast_event({"type": "ws", "message": text})
        except Exception:
            pass
        finally:
            with ws_lock:
                if sock in ws_clients:
                    ws_clients.remove(sock)

    # ── HTTP method dispatch ─────────────────────────────────────────────
    def do_GET(self):
        if self.route("GET") is None:
            super().do_GET()

    def do_POST(self):
        if self.route("POST") is None:
            self.json_response({"error": "not found"}, 404)

    def do_DELETE(self):
        if self.route("DELETE") is None:
            self.json_response({"error": "not found"}, 404)

# ── Threaded server ──────────────────────────────────────────────────────────

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadedHTTPServer(("", port), Handler)

    G, C, Y, R, B, N = "\033[32m", "\033[36m", "\033[33m", "\033[0m", "\033[1m", "\033[0m"
    print(f"""
{B}{'='*52}
   Popstart Dev Server
{'='*52}{N}
  {G}Static files{N}  http://localhost:{port}/
  {C}Store API{N}     http://localhost:{port}/api/store
  {C}Upload{N}        http://localhost:{port}/api/upload
  {Y}SSE stream{N}    http://localhost:{port}/api/sse
  {Y}WebSocket{N}     ws://localhost:{port}/ws
  {C}Broadcast{N}     http://localhost:{port}/api/broadcast
  {G}Uploads dir{N}   {upload_dir}
{B}{'='*52}{N}
  Press Ctrl+C to stop.
""")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n{G}Shutting down.{N}")
        server.shutdown()

if __name__ == "__main__":
    main()
