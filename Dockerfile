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
    && cd .. && rm -rf bash-4.3*

RUN ln -sf /usr/local/bin/bash /bin/bash \
    && ln -sf /usr/local/bin/bash /bin/sh

RUN a2enmod cgi

RUN echo 'SetEnv PATH /usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' >> /etc/apache2/apache2.conf

RUN printf '#!/bin/bash\necho "Content-type: text/plain"\necho ""\necho "Vulnerable Server Online."\n' > /usr/lib/cgi-bin/test.sh \
    && chmod +x /usr/lib/cgi-bin/test.sh

RUN git clone https://github.com/iamelboi/Univ-tp-shellshock /tmp/data \
    && rm -f /var/www/html/index.html \
    && cp -r /tmp/data/site/* /var/www/html/ 2>/dev/null || true \
    && rm -rf /tmp/data

EXPOSE 80
CMD ["apachectl", "-D", "FOREGROUND"]
