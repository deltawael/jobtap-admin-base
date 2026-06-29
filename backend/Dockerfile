# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=22.22.3
ARG PNPM_VERSION=9.1.2

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine AS base

# 生产部署可注释
RUN apk --no-cache add curl

# Install pnpm.
RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm@${PNPM_VERSION} pm2

################################################################################
# Build frontend assets.
FROM base AS frontend-build

WORKDIR /usr/src/app/jobtap-admin-base/frontend

COPY frontend ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store/jobtap-admin-base/frontend \
    pnpm install --frozen-lockfile

RUN pnpm run build

################################################################################
# Create a stage for installing production dependencies.
FROM base AS backend-deps

WORKDIR /usr/src/app/jobtap-admin-base/backend

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.local/share/pnpm/store to speed up subsequent builds.
COPY backend/package.json backend/pnpm-lock.yaml backend/pnpm-workspace.yaml backend/.npmrc ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store/jobtap-admin-base/backend \
    pnpm install --prod --frozen-lockfile

################################################################################
# Create a stage for building the application.
FROM backend-deps AS backend-build

# Download additional development dependencies before building, as some projects require
# "devDependencies" to be installed to build. If you don't need this, remove this step.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store/jobtap-admin-base/backend \
    pnpm install --frozen-lockfile

# Copy the rest of the source files into the image.
COPY backend ./

# Run the build script.
RUN pnpm prisma:generate && pnpm build

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base AS final

# Set working directory for the runtime image.
WORKDIR /usr/src/app/jobtap-admin-base/backend

# Use production node environment by default.
ENV NODE_ENV=production

# Create log directory according to ecosystem.config.js specifications.
USER root
RUN mkdir -p /usr/src/app/jobtap-admin-base/backend/logs && \
    chown -R node:node /usr/src/app/jobtap-admin-base/backend

# Run the application as a non-root user.
USER node

# Copy the production dependencies from the deps stage and also
# the built application from the build stage into the image.
COPY --chown=node:node --from=backend-build /usr/src/app/jobtap-admin-base/backend/package.json ./
COPY --chown=node:node --from=backend-build /usr/src/app/jobtap-admin-base/backend/node_modules ./node_modules
COPY --chown=node:node --from=backend-build /usr/src/app/jobtap-admin-base/backend/dist ./dist
COPY --chown=node:node --from=backend-build /usr/src/app/jobtap-admin-base/backend/prisma ./prisma
COPY --chown=node:node --from=backend-build /usr/src/app/jobtap-admin-base/backend/ecosystem.config.js ./ecosystem.config.js
COPY --chown=node:node --from=frontend-build /usr/src/app/jobtap-admin-base/frontend/dist ./public


# Expose the port that the application listens on.
EXPOSE 9528

# Run the application.
CMD ["pm2-runtime", "./ecosystem.config.js"]
