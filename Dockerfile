FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
  curl \
  ca-certificates \
  git \
  python3 \
  python3-pip \
  python3-venv \
  libcairo2 \
  libpango-1.0-0 \
  libpangoft2-1.0-0 \
  libpangocairo-1.0-0 \
  libglib2.0-0 \
  libgdk-pixbuf-2.0-0 \
  libffi-dev \
  ffmpeg \
  texlive \
  texlive-latex-extra \
  texlive-fonts-extra \
  texlive-science \
  && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

# Install Manim and Python deps
RUN pip3 install --no-cache-dir manim

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "server.ts"]
