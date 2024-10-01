# Backend Dockerfile (例: backend/Dockerfile)
FROM node:lts

# 作業ディレクトリの指定
WORKDIR /usr/src/app

# パッケージファイルをコピー
COPY package*.json ./

# 依存パッケージのインストール
RUN npm install

# ソースコードをコピー
COPY . .  

# バックエンドのポートを公開
EXPOSE 5000

# Expressサーバーの起動
CMD ["node", "index.js"]
