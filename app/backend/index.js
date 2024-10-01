const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs'); // ファイル操作用モジュール
const path = require('path');
const app = express();
const port = 5000;

// CORS設定
const corsOptions = {
  origin: '*',
  // origin: ['http://133.49.24.115:3000','https://nakayamaken-pss.web.app/'], // 全てのオリジンを許可
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // 許可するHTTPメソッド
  allowedHeaders: ['Content-Type', 'Authorization'] // 許可するHTTPヘッダー
};

// CORSを許可
app.use(cors(corsOptions));

// JSONパーサーを追加
app.use(express.json());


// 画像ファイルの静的提供設定
app.use('/images', express.static('/images'));


// MySQL データベース接続情報
const pool = mysql.createPool({
  host: "mysql", // MySQLのホスト
  user: 'yamashita', // MySQLのユーザー名
  password: 'yamashita', // MySQLのパスワード
  database: 'moving_objects_db', // データベース名
  port: 3306, // MySQLのポート
  waitForConnections: true,
  connectionLimit: 10, // コネクションプールの最大接続数
  queueLimit: 0 // キューの最大数（0は無制限）
});



// プロジェクトIDに基づいてカメラIDリストを取得するエンドポイント
app.get('/api/projects/:projectId/cameras', async (req, res) => {
  const projectId = req.params.projectId;
  const query = 'SELECT DISTINCT camera_id FROM original_images WHERE project_id = ?';
  try {
    const [results] = await pool.query(query, [projectId]);
    res.json({ cameras: results.map(row => row.camera_id.toString()) });
  } catch (err) {
    console.error('データ取得エラー:', err);
    res.status(500).json({ error: 'データ取得エラー' });
  }
});

// クラスタ（class_id）データを取得するエンドポイント
app.get('/api/projects/:projectId/cameras/:cameraId/clusters', async (req, res) => {
  const { projectId, cameraId } = req.params;
  const query = 'SELECT DISTINCT class_id AS cluster_id FROM moving_objects WHERE original_image_id IN (SELECT id FROM original_images WHERE project_id = ? AND camera_id = ?) AND class_id IS NOT NULL';

  try {
    const [results] = await pool.query(query, [projectId, cameraId]);
    res.json({ clusters: results.map(row => row.cluster_id.toString()) });
  } catch (err) {
    console.error('データ取得エラー:', err);
    res.status(500).json({ error: 'データ取得エラー' });
  }
});

// 画像リストを取得するエンドポイント
// 画像リストを取得するエンドポイント
app.get('/api/projects/:projectId/cameras/:cameraId/clusters/:clusterId/images', async (req, res) => {
  const { projectId, cameraId, clusterId } = req.params;
  const { page = 1, limit = 10, period = 'all', order = 'newest' } = req.query; // デフォルト値を指定
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // 期間に応じたフィルタリング条件
  let periodCondition = '';
  if (period !== 'all') {
    const periodMapping = {
      '1d': 'INTERVAL 1 DAY',
      '1w': 'INTERVAL 1 WEEK',
      '1m': 'INTERVAL 1 MONTH',
      '6m': 'INTERVAL 6 MONTH',
      '1y': 'INTERVAL 1 YEAR'
    };
    const interval = periodMapping[period] || '';
    if (interval) {
      periodCondition = `AND oi.timestamp >= NOW() - ${interval}`;
    }
  }

  // 並び替えの条件
  const orderCondition = order === 'oldest' ? 'ASC' : 'DESC';

  // クエリ構築
  const query = `
    SELECT mo.id, mo.object_filename, mo.class_id, oi.camera_id, oi.timestamp, oi.filename AS original_filename 
    FROM moving_objects mo
    INNER JOIN original_images oi ON mo.original_image_id = oi.id
    WHERE oi.project_id = ? AND oi.camera_id = ? AND mo.class_id = ? ${periodCondition}
    ORDER BY oi.timestamp ${orderCondition}
    LIMIT ? OFFSET ?`;

  try {
    const [results] = await pool.query(query, [projectId, cameraId, clusterId, parseInt(limit), offset]);
    
    // 画像情報を返す
    const images = results.map((row) => {
      const cameraId = row.camera_id;
      const classId = row.class_id;
      const originalFilename = row.original_filename;
      const objectFilename = row.object_filename;
      const timestamp = row.timestamp;

      // サーバ上の実際のファイルパスを組み立て
      const objectImagePath = `/images/Results/camera0/ResNet50/class_${classId}/${objectFilename}`;
      const originalImagePath = `/images/detection_result/0923/image0/filter/${originalFilename}`;

      return {
        id: row.id,
        objectImage: objectImagePath,
        originalImage: originalImagePath,
        cameraId: cameraId,
        classId: classId,
        filename: objectFilename,
        originalfilename: originalFilename,
        timestamp: timestamp
      };
    });

    res.json({ images });
  } catch (err) {
    console.error('データ取得エラー:', err);
    res.status(500).json({ error: 'データ取得エラー' });
  }
});

// 画像削除API
app.delete('/api/images/:id', async (req, res) => {
  const imageId = req.params.id;

  // SQLクエリで対象の画像ファイル名とクラスID、カメラIDを取得
  const query = 'SELECT object_filename, class_id, oi.camera_id FROM moving_objects mo INNER JOIN original_images oi ON mo.original_image_id = oi.id WHERE mo.id = ?';
  
  try {
    const [results] = await pool.query(query, [imageId]);

    if (results.length === 0) {
      return res.status(404).json({ error: '画像が見つかりません' });
    }

    // 取得したファイルパス情報をもとに、サーバ上の実際のファイルパスを組み立てる
    const objectFilename = results[0].object_filename;
    const classId = results[0].class_id;
    const cameraId = results[0].camera_id;

    // 実際のファイルパスの組み立て
    const objectFilePath = path.join('/images/Results', `camera0`, 'ResNet50', `class_${classId}`, objectFilename);

    // サーバ上のファイルを削除
    fs.unlink(objectFilePath, async (err) => {
      if (err) {
        console.error('ファイル削除エラー:', err);
        return res.status(500).json({ error: 'ファイル削除エラー' });
      }

      // データベースからレコードを削除
      const deleteQuery = 'DELETE FROM moving_objects WHERE id = ?';
      try {
        await pool.query(deleteQuery, [imageId]);
        res.json({ message: '画像とデータが削除されました' });
      } catch (deleteErr) {
        console.error('データ削除エラー:', deleteErr);
        res.status(500).json({ error: 'データ削除エラー' });
      }
    });
  } catch (err) {
    console.error('データ取得エラー:', err);
    res.status(500).json({ error: 'データ取得エラー' });
  }
});

// クラスタ内の全画像を削除するAPI
app.delete('/api/clusters/:clusterId/images', async (req, res) => {
  const clusterId = req.params.clusterId;

  // クラスタに含まれるすべてのファイルパスを取得するクエリ
  const query = 'SELECT object_filename, class_id, oi.camera_id FROM moving_objects mo INNER JOIN original_images oi ON mo.original_image_id = oi.id WHERE mo.class_id = ?';
  
  try {
    const [results] = await pool.query(query, [clusterId]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'クラスタに画像が見つかりません' });
    }

    // ファイル削除の処理
    results.forEach((row) => {
      const objectFilename = row.object_filename;
      const classId = row.class_id;
      const cameraId = row.camera_id;
      const objectFilePath = path.join('/images/Results', `camera0`, 'ResNet50', `class_${classId}`, objectFilename);

      // 各ファイルを削除
      fs.unlink(objectFilePath, (err) => {
        if (err) {
          console.error('ファイル削除エラー:', err);
        } else {
          console.log(`削除されました: ${objectFilePath}`);
        }
      });
    });

    // データベースからクラスタに対応するすべてのレコードを削除
    const deleteQuery = 'DELETE FROM moving_objects WHERE class_id = ?';
    try {
      await pool.query(deleteQuery, [clusterId]);
      res.json({ message: 'クラスタ内の全画像とデータが削除されました' });
    } catch (deleteErr) {
      console.error('データ削除エラー:', deleteErr);
      res.status(500).json({ error: 'データ削除エラー' });
    }
  } catch (err) {
    console.error('データ取得エラー:', err);
    res.status(500).json({ error: 'データ取得エラー' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});