FROM manimcommunity/manim:stable

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["bun", "run", "server.ts"]
