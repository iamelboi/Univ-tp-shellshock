FROM debian:bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    apache2 \
    build-essential \
    ca-certificates \
    curl \
    wget \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# --- bash 4.3  PAS MODIF ---
RUN wget https://mirrors.kernel.org/gnu/bash/bash-4.3.tar.gz \
    && tar xzf bash-4.3.tar.gz \
    && cd bash-4.3 \
    && ./configure && make && make install \
    && cd .. && rm -rf bash-4.3 bash-4.3.tar.gz \
    && ln -sf /usr/local/bin/bash /bin/bash

RUN a2enmod cgi
COPY docker/status.sh /usr/lib/cgi-bin/status.sh
RUN chmod +x /usr/lib/cgi-bin/status.sh

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

RUN chown -R www-data:www-data /app && chmod 644 /app/.env

COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

EXPOSE 80 3000
CMD ["/usr/local/bin/start.sh"]
