# ベースイメージの指定
FROM node:lts

# 作業ディレクトリの指定
WORKDIR /usr/src/app

# パッケージファイルをコピー
COPY package*.json ./

# パッケージのインストール
RUN yarn install

# アプリケーションのソースコードをコピー
COPY . .
# ビルド
RUN yarn build

# 実行コマンド
CMD ["yarn", "start"]
