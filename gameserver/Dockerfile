FROM node:20-slim

# Create gameserver user and group
RUN groupadd -g 1001 gameserver && \
    useradd -u 1001 -g gameserver -s /bin/bash gameserver

# Install wget for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends wget && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy compiled JavaScript to dist folder (keeping original structure)
COPY dist/ ./dist/

# Change ownership to gameserver user
RUN chown -R gameserver:gameserver /app

# Expose the gameserver port
EXPOSE 3001

# Environment variables
ENV PORT=3001
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Switch to non-root user
USER gameserver

# Start the server
CMD ["node", "dist/server.js"]
