FROM debian:bookworm

RUN apt-get update && apt-get install -y apache2 build-essential wget git

RUN wget http://ftp.gnu.org/gnu/bash/bash-4.3.tar.gz \
    && tar xzf bash-4.3.tar.gz \
    && cd bash-4.3 \
    && ./configure && make && make install

RUN ln -sf /usr/local/bin/bash /bin/bash

RUN bash --version

RUN a2enmod cgi

RUN echo -e '#!/bin/bash\necho "Content-type: text/html"\necho ""\necho "Vulnerable Server Online."' \
    > /usr/lib/cgi-bin/test.sh \
    && chmod +x /usr/lib/cgi-bin/test.sh

RUN git clone https://github.com/iamelboi/Univ-tp-shellshock /tmp/data \
    && cp /tmp/data/site/. /var/www/html \
    && rm -rf /tmp/data

EXPOSE 80
CMD ["apachectl", "-D", "FOREGROUND"]
