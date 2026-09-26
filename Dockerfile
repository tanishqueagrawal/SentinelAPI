FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./backend/

RUN npm install --prefix backend

COPY scanner/requirements.txt ./scanner/

RUN pip3 install --break-system-packages \
    -r scanner/requirements.txt

COPY . .

EXPOSE 4000

CMD ["npm", "start", "--prefix", "backend"]