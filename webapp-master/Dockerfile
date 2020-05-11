FROM node:10
WORKDIR /webapp
COPY package.json /webapp
ENV DB_HOST="mysql1"
ENV DB_USER="app_user"
ENV DB_PASSWORD="password"
ENV DB_NAME="csye6225"
RUN npm install
COPY . /webapp
# Entrypoint script
# RUN cp docker-entrypoint.sh /usr/local/bin/ && \
#     chmod +x /usr/local/bin/docker-entrypoint.sh
# Expose the port
EXPOSE 3000
