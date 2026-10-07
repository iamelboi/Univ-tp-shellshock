FROM debian:bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    apache2 \
    build-essential \
    ca-certificates \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://mirrors.kernel.org/gnu/bash/bash-4.3.tar.gz \
    && tar xzf bash-4.3.tar.gz \
    && cd bash-4.3 \
    && ./configure && make && make install \
    && cd .. && rm -rf bash-4.3 bash-4.3.tar.gz

RUN ln -sf /usr/local/bin/bash /bin/bash

RUN a2enmod cgi

RUN printf '#!/bin/dash\necho "Content-type: text/plain"\necho ""\n/bin/bash -c "echo Vulnerable Server Online."\n' > /usr/lib/cgi-bin/test.sh \
    && chmod +x /usr/lib/cgi-bin/test.sh

RUN git clone https://github.com/iamelboi/Univ-tp-shellshock /tmp/data \
    && rm -f /var/www/html/index.html \
    && cp -r /tmp/data/site/* /var/www/html/ 2>/dev/null || true \
    && rm -rf /tmp/data

EXPOSE 80
CMD ["apachectl", "-D", "FOREGROUND"]
