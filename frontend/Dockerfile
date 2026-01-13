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

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx config template with PORT variable
RUN echo 'server { \
    listen ${PORT}; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/templates/default.conf.template

# Railway provides PORT env var (default to 80 for local)
ENV PORT=80

# Use envsubst to substitute PORT at runtime
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
