# Asteroids Game Server

Server-autoritativer WebSocket Game-Server für das YouthFM Asteroids Multiplayer-Spiel.

## Features

- **Server-autoritative Physik** - Cheat-sichere Spiellogik auf dem Server
- **30 Hz Tick-Rate** - Flüssiges Gameplay mit regelmäßigen State-Updates
- **JWT-Authentifizierung** - Sichere Verbindungen via Token
- **MessagePack-Protokoll** - Binäre Serialisierung für niedrige Latenz
- **Docker-ready** - Einfaches Deployment auf Plesk oder anderen Plattformen

## Lokale Entwicklung

### Voraussetzungen

- Node.js 20+
- npm

### Installation

```bash
cd gameserver
npm install
```

### Starten (Development)

```bash
npm run dev
```

### Bauen (Production)

```bash
npm run build
npm start
```

## Docker Deployment

### Bauen und Starten

```bash
docker-compose up -d --build
```

### Nur Bauen

```bash
docker build -t asteroids-gameserver .
```

### Manuell Starten

```bash
docker run -d \
  -p 3001:3001 \
  -e JWT_SECRET=your-secret-key \
  -e ALLOWED_ORIGINS=https://youthfm.de \
  --name asteroids-gameserver \
  asteroids-gameserver
```

## Konfiguration

### Umgebungsvariablen

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `PORT` | 3001 | Server-Port |
| `HOST` | 0.0.0.0 | Bind-Adresse |
| `TICK_RATE` | 30 | Game-Loop Frequenz (Hz) |
| `JWT_SECRET` | - | Shared Secret für Token-Validierung |
| `ALLOWED_ORIGINS` | * | Erlaubte CORS-Origins (komma-getrennt) |
| `LOG_LEVEL` | info | Log-Level (debug, info, warn, error) |

## API Endpoints

### Health Check

```
GET /health
```

Gibt Server-Status und Statistiken zurück.

### Stats

```
GET /stats
```

Detaillierte Server-Statistiken inkl. Memory-Usage.

### WebSocket

```
WS /ws?room=ROOM_ID&token=JWT_TOKEN
```

WebSocket-Verbindung für Gameplay.

## Protokoll

### Client → Server

```typescript
// Input (binär, msgpack)
{ type: 'input', moveX: -1..1, shoot?: boolean }

// Ping
{ type: 'ping', t: timestamp }
```

### Server → Client

```typescript
// State Update (30x/s)
{ type: 'state', payload: WorldSnapshot }

// Joined Confirmation
{ type: 'joined', playerId: string, roomId: string }

// Player Left
{ type: 'left', playerId: string }

// Game Start
{ type: 'gameStart' }

// Game End
{ type: 'gameEnd', scores: { playerId: score } }

// Pong
{ type: 'pong', t: clientTime, serverTime: serverTime }

// Error
{ type: 'error', code: string, message: string }
```

## Plesk Deployment

1. **Docker Extension** in Plesk installieren
2. **Neuen Container** erstellen
3. Image: `asteroids-gameserver` (lokal bauen oder Registry nutzen)
4. Port-Mapping: Host 3001 → Container 3001
5. Environment-Variablen setzen
6. **Reverse Proxy** in Plesk für `game.yourdomain.de` → `localhost:3001` einrichten
7. SSL-Zertifikat via Let's Encrypt aktivieren

## Architektur

```
┌─────────────────────────────────────────────────────┐
│                  GameServer                          │
│  ┌──────────────────────────────────────────────┐  │
│  │  uWebSockets.js (WebSocket Server)           │  │
│  └──────────────────────────────────────────────┘  │
│         │                                           │
│         ▼                                           │
│  ┌──────────────────────────────────────────────┐  │
│  │  RoomManager                                  │  │
│  │  ├── Room 1                                   │  │
│  │  │   ├── GameLoop (30 Hz)                    │  │
│  │  │   ├── Physics                             │  │
│  │  │   └── Players[]                           │  │
│  │  └── Room 2...                               │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```
