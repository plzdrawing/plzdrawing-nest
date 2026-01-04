# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

# Install all dependencies for build
RUN pnpm install --frozen-lockfile

COPY . .

# Build the application
RUN pnpm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy firebase config (Ensure this file exists or mount it as a volume)
COPY firebase-service-account.json ./

EXPOSE 3000

CMD ["node", "dist/main"]
