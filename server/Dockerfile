FROM node:8
WORKDIR /usr/src/app
# copy Node.js specific files
COPY package*.json ./
# copy application source file to the workdir
COPY index.js .
RUN npm install
# TCP port that application is listening on
EXPOSE 4000
CMD [ "node", "index.js" ]
