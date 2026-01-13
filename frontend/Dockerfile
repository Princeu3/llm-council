# Frontend Dockerfile - Multi-stage build
FROM node:22-alpine AS builder

WORKDIR /app

# Build arg for API base URL
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app (Vite will use VITE_API_BASE env var)
RUN npm run build

# Production stage - lightweight node server
FROM node:22-alpine

WORKDIR /app

# Install serve globally
RUN npm install -g serve

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Railway provides PORT env var
ENV PORT=3000

# Serve the static files with SPA fallback
CMD ["sh", "-c", "serve -s dist -l $PORT"]
