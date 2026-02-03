FROM manimcommunity/manim:stable

USER root
RUN apt-get update && apt-get install -y curl unzip && rm -rf /var/lib/apt/lists/*

# Install Bun
ENV BUN_INSTALL=/usr/local/bun
RUN curl -fsSL https://bun.sh/install | bash
RUN ln -s /usr/local/bun/bin/bun /usr/local/bin/bun
ENV PATH="/usr/local/bin:$PATH"

USER manimuser

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "server.ts"]
