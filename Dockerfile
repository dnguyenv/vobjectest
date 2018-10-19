FROM node:8
ENV LIFE_TIME=300000\
    URL=https://icp.innovate.ibm.com:30006/image\
    INTERVAL=3000\
    DEBUG=*
  #  IMG_SRC_DIR 'img-src'\
  #  IMG_TEST_DIR img-test\
COPY . /app
WORKDIR /app 
RUN npm i
ENTRYPOINT [ "/bin/bash","-c","node ." ] 
