package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"mime"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/coder/websocket"
)

type eventHub struct {
	mu         sync.Mutex
	sseClients map[chan []byte]struct{}
	wsClients  map[*websocket.Conn]struct{}
}

func newEventHub() *eventHub {
	return &eventHub{
		sseClients: make(map[chan []byte]struct{}),
		wsClients:  make(map[*websocket.Conn]struct{}),
	}
}

func (h *eventHub) addSSE(ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.sseClients[ch] = struct{}{}
}

func (h *eventHub) removeSSE(ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.sseClients, ch)
}

func (h *eventHub) addWS(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.wsClients[conn] = struct{}{}
}

func (h *eventHub) removeWS(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.wsClients, conn)
}

func (h *eventHub) broadcast(v any) {
	payload, err := json.Marshal(v)
	if err != nil {
		return
	}

	h.mu.Lock()
	sseClients := make([]chan []byte, 0, len(h.sseClients))
	for ch := range h.sseClients {
		sseClients = append(sseClients, ch)
	}
	wsClients := make([]*websocket.Conn, 0, len(h.wsClients))
	for conn := range h.wsClients {
		wsClients = append(wsClients, conn)
	}
	h.mu.Unlock()

	for _, ch := range sseClients {
		select {
		case ch <- payload:
		default:
		}
	}

	for _, conn := range wsClients {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		err := conn.Write(ctx, websocket.MessageText, payload)
		cancel()
		if err != nil {
			h.removeWS(conn)
			_ = conn.Close(websocket.StatusInternalError, "write failed")
		}
	}
}

type server struct {
	storeMu   sync.Mutex
	store     map[string]map[string]any
	uploadMu  sync.Mutex
	uploadDir string
	hub       *eventHub
}

func newServer() (*server, error) {
	uploadDir, err := os.MkdirTemp("", "popstart_uploads_")
	if err != nil {
		return nil, err
	}
	return &server{
		store:     make(map[string]map[string]any),
		uploadDir: uploadDir,
		hub:       newEventHub(),
	}, nil
}

func main() {
	port := "8000"
	if len(os.Args) > 1 {
		port = os.Args[1]
	}

	srv, err := newServer()
	if err != nil {
		log.Fatal(err)
	}

	handler := srv.routes()
	httpServer := &http.Server{
		Addr:              "127.0.0.1:" + port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
	}

	fmt.Printf(`
====================================================
   Popstart Dev Server (Go)
====================================================
  Static files  http://localhost:%s/
  Store API     http://localhost:%s/api/store
  Upload        http://localhost:%s/api/upload
  SSE stream    http://localhost:%s/api/sse
  WebSocket     ws://localhost:%s/ws
  Broadcast     http://localhost:%s/api/broadcast
  Uploads dir   %s
====================================================
  Press Ctrl+C to stop.

`, port, port, port, port, port, port, srv.uploadDir)

	log.Fatal(httpServer.ListenAndServe())
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/store", s.handleStore)
	mux.HandleFunc("/api/store/", s.handleStoreItem)
	mux.HandleFunc("/api/upload", s.handleUpload)
	mux.HandleFunc("/api/uploads/", s.handleUploadedFile)
	mux.HandleFunc("/api/broadcast", s.handleBroadcast)
	mux.HandleFunc("/api/sse", s.handleSSE)
	mux.HandleFunc("/ws", s.handleWS)
	mux.Handle("/", http.FileServer(http.Dir(".")))
	return s.withLocalOnly(mux)
}

func (s *server) withLocalOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") || r.URL.Path == "/ws" {
			if !requestAllowed(r) {
				writeJSON(w, http.StatusForbidden, map[string]any{"error": "local access only"})
				return
			}
			origin := r.Header.Get("Origin")
			if origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			}
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func requestAllowed(r *http.Request) bool {
	host := r.Host
	if strings.Contains(host, ":") {
		host, _, _ = net.SplitHostPort(host)
	}
	if host != "" && host != "127.0.0.1" && host != "localhost" {
		return false
	}

	remoteHost, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return false
	}
	ip := net.ParseIP(remoteHost)
	if ip == nil || !ip.IsLoopback() {
		return false
	}

	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	return (u.Scheme == "http" || u.Scheme == "https") && (u.Hostname() == "127.0.0.1" || u.Hostname() == "localhost")
}

func (s *server) handleStore(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.storeMu.Lock()
		items := make([]map[string]any, 0, len(s.store))
		for _, item := range s.store {
			items = append(items, cloneMap(item))
		}
		s.storeMu.Unlock()
		writeJSON(w, http.StatusOK, items)
	case http.MethodPost:
		var obj map[string]any
		if err := json.NewDecoder(r.Body).Decode(&obj); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
			return
		}
		if _, ok := obj["id"].(string); !ok || obj["id"] == "" {
			obj["id"] = randomID()
		}
		id := obj["id"].(string)
		s.storeMu.Lock()
		s.store[id] = cloneMap(obj)
		s.storeMu.Unlock()
		s.hub.broadcast(map[string]any{"type": "store", "action": "create", "data": obj})
		writeJSON(w, http.StatusCreated, obj)
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
	}
}

func (s *server) handleStoreItem(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimPrefix(r.URL.Path, "/api/store/")
	if key == "" {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.storeMu.Lock()
		obj, ok := s.store[key]
		s.storeMu.Unlock()
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
			return
		}
		writeJSON(w, http.StatusOK, cloneMap(obj))
	case http.MethodDelete:
		s.storeMu.Lock()
		_, ok := s.store[key]
		if ok {
			delete(s.store, key)
		}
		s.storeMu.Unlock()
		if !ok {
			writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
			return
		}
		s.hub.broadcast(map[string]any{"type": "store", "action": "delete", "id": key})
		writeJSON(w, http.StatusOK, map[string]any{"deleted": true})
	default:
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
	}
}

func (s *server) handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}

	fileName, data, err := parseMultipartUpload(r)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": err.Error()})
		return
	}

	safeName := filepath.Base(fileName)
	dest := filepath.Join(s.uploadDir, safeName)
	s.uploadMu.Lock()
	err = os.WriteFile(dest, data, 0o644)
	s.uploadMu.Unlock()
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "write failed"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"filename": safeName,
		"size":     len(data),
		"path":     dest,
		"url":      "/api/uploads/" + url.PathEscape(safeName),
	})
}

func (s *server) handleUploadedFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}
	name, err := url.PathUnescape(strings.TrimPrefix(r.URL.Path, "/api/uploads/"))
	if err != nil || name == "" {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
		return
	}
	path := filepath.Join(s.uploadDir, filepath.Base(name))
	data, err := os.ReadFile(path)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]any{"error": "not found"})
		return
	}
	if ctype := mime.TypeByExtension(filepath.Ext(path)); ctype != "" {
		w.Header().Set("Content-Type", ctype)
	}
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	_, _ = w.Write(data)
}

func (s *server) handleBroadcast(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}
	var obj map[string]any
	if err := json.NewDecoder(r.Body).Decode(&obj); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid json"})
		return
	}
	s.hub.broadcast(map[string]any{"type": "broadcast", "message": obj["message"]})
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (s *server) handleSSE(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"error": "streaming unsupported"})
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ch := make(chan []byte, 32)
	s.hub.addSSE(ch)
	defer s.hub.removeSSE(ch)

	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	ctx := r.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case payload := <-ch:
			_, _ = fmt.Fprintf(w, "data: %s\n\n", sanitizeSSE(payload))
			flusher.Flush()
		case t := <-ticker.C:
			heartbeat, _ := json.Marshal(map[string]any{"type": "heartbeat", "t": t.Unix()})
			_, _ = fmt.Fprintf(w, "data: %s\n\n", heartbeat)
			flusher.Flush()
		}
	}
}

func (s *server) handleWS(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"error": "method not allowed"})
		return
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: []string{"127.0.0.1", "localhost"},
	})
	if err != nil {
		return
	}
	defer conn.CloseNow()

	s.hub.addWS(conn)
	defer s.hub.removeWS(conn)

	ctx := r.Context()
	for {
		typ, data, err := conn.Read(ctx)
		if err != nil {
			status := websocket.CloseStatus(err)
			if status == websocket.StatusNormalClosure || status == websocket.StatusGoingAway {
				return
			}
			var cerr websocket.CloseError
			if errors.As(err, &cerr) {
				return
			}
			return
		}
		if typ != websocket.MessageText {
			continue
		}
		msg := string(data)
		s.hub.broadcast(json.RawMessage(data))
		s.hub.broadcast(map[string]any{"type": "ws", "message": msg})
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	body, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		http.Error(w, `{"error":"encode failed"}`, http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(body)))
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

func parseMultipartUpload(r *http.Request) (string, []byte, error) {
	reader, err := r.MultipartReader()
	if err != nil {
		return "", nil, errors.New("no file found")
	}
	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return "", nil, errors.New("no file found")
		}
		if part.FileName() == "" {
			_, _ = io.Copy(io.Discard, part)
			continue
		}
		data, err := io.ReadAll(part)
		if err != nil {
			return "", nil, errors.New("read failed")
		}
		return part.FileName(), data, nil
	}
	return "", nil, errors.New("no file found")
}

func cloneMap(src map[string]any) map[string]any {
	out := make(map[string]any, len(src))
	for k, v := range src {
		out[k] = v
	}
	return out
}

func randomID() string {
	var buf [16]byte
	if _, err := rand.Read(buf[:]); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf[:])
}

func sanitizeSSE(payload []byte) string {
	return strings.ReplaceAll(string(payload), "\n", "")
}
