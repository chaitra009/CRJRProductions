# Build Stage: Frontend
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build

# Runtime Stage: Unified Environment
FROM python:3.10-slim
WORKDIR /app

# Install Node.js in the runtime container
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy built frontend assets
COPY --from=frontend-build /app/dist ./dist

# Copy backend and server files
COPY backend ./backend
COPY server.ts ./
COPY package*.json ./
COPY tsconfig.json ./

# Install production node dependencies (for tsx/express)
RUN npm install --only=production --legacy-peer-deps

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV BACKEND_PORT=5000

# Expose the frontend port
EXPOSE 3000

# Start the Node.js server which supervises the Python backend
CMD ["npx", "tsx", "server.ts"]
