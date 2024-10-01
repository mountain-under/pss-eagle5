import React, { useState, useEffect } from 'react';
import './ImageSearch.css';

// 型定義
interface Image {
  id: number;
  objectImage: string;
  originalImage: string;
  cameraId: number;
  classId: number;
  filename: string;
  originalFilename: string;
  timestamp: string;
}

const DEFAULT_PROJECT_ID = 1; 

const ImageDeletion: React.FC = () => {
  const [cameras, setCameras] = useState<string[]>([]);
  const [clusters, setClusters] = useState<string[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [images, setImages] = useState<Image[]>([]);
  const [displayedImages, setDisplayedImages] = useState<Image[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const imagesPerPage = 10;
  const [modalImage, setModalImage] = useState<{
    objectImage: string;
    originalImage: string;
    objectFilename: string;
    originalFilename: string;
  } | null>(null);
  const [isDeleted, setIsDeleted] = useState<boolean>(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all'); // 全期間の初期選択
  const [selectedOrder, setSelectedOrder] = useState<string>('newest'); // 新しい順の初期選択
  
  

  // プロジェクト選択後、カメラを取得するuseEffect
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        // プロジェクトIDをリクエストに含めて送信
        const response = await fetch(`https://eagle5.fu.is.saga-u.ac.jp/pss-backend/api/projects/${DEFAULT_PROJECT_ID}/cameras`);
        if (!response.ok) {
          console.error('HTTPエラー:', response.status);
          return;
        }
        const data = await response.json();
        setCameras(data.cameras); // カメラリストをセット
        setSelectedCamera(''); // カメラの選択をリセット
        setImages([]); // 画像リセット
        setDisplayedImages([]); // 表示リセット
      } catch (error) {
        console.error('カメラの取得エラー:', error);
      }
    };
    fetchCameras();
  }, []);

  // カメラ選択後、クラスタを取得するuseEffect
  useEffect(() => {
    const fetchClusters = async () => {
      if (selectedCamera) {
        try {
          const response = await fetch(`https://eagle5.fu.is.saga-u.ac.jp/pss-backend/api/projects/${DEFAULT_PROJECT_ID}/cameras/${selectedCamera}/clusters`);
          if (!response.ok) {
            console.error('HTTPエラー:', response.status);
            return;
          }
          const data = await response.json();
          setClusters(data.clusters); // クラスタリストをセット
          setSelectedCluster(''); // クラスタの選択をリセット
          setImages([]); // 画像リセット
          setDisplayedImages([]); // 表示リセット
          setCurrentPage(1);
        } catch (error) {
          console.error('クラスタの取得エラー:', error);
        }
      }
    };
    fetchClusters();
  }, [selectedCamera]);

  // クラスタ選択後にページをリセット
  useEffect(() => {
    setCurrentPage(1); // クラスタ変更時にページ番号をリセット
  }, [selectedCluster]);

  // クラスタ選択後、画像を取得するuseEffect
  useEffect(() => {
    const fetchImages = async () => {
      if (selectedCamera && selectedCluster) {
        try {
          const response = await fetch(`https://eagle5.fu.is.saga-u.ac.jp/pss-backend/api/projects/${DEFAULT_PROJECT_ID}/cameras/${selectedCamera}/clusters/${selectedCluster}/images?page=${currentPage}&limit=${imagesPerPage}&period=${selectedPeriod}&order=${selectedOrder}`);
          if (!response.ok) {
            console.error('HTTPエラー:', response.status);
            return;
          }
          const data = await response.json();
          console.log('取得された画像データ:', data); // 取得したデータをログに表示
          setImages(data.images); // 画像データをセット
          setDisplayedImages(data.images); // ページに応じた画像を表示
        } catch (error) {
          console.error('画像の取得エラー:', error);
        }
      } else {
        setImages([]);
        setDisplayedImages([]);
      }
    };
    fetchImages();
  }, [selectedCamera, selectedCluster, currentPage, selectedPeriod, selectedOrder]);

  // ページ切り替え
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // 画像をクリックしたときの処理（モーダル表示）
  const handleImageClick = (objectImage: string, originalImage: string, objectFilename: string, originalFilename: string) => {
    setModalImage({ 
      objectImage, 
      originalImage, 
      objectFilename, 
      originalFilename 
    });
  };

  // モーダルを閉じる
  const handleCloseModal = () => {
    setModalImage(null);
  };

  // 画像削除リクエスト
  const handleDeleteImage = async (imageId: number) => {
    if (window.confirm('本当にこの画像を削除しますか？')) {
      try {
        await fetch(`https://eagle5.fu.is.saga-u.ac.jp/pss-backend/api/images/${imageId}`, {
          method: 'DELETE',
        });
        setIsDeleted(true);
        // 削除後の画像リストを更新
        setImages((prevImages) => prevImages.filter((image) => image.id !== imageId));
        setDisplayedImages((prevImages) => prevImages.filter((image) => image.id !== imageId));
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
  };

  // クラスタ削除リクエスト
  const handleDeleteCluster = async () => {
    if (window.confirm('本当にこのクラスタの全画像を削除しますか？')) {
      try {
        await fetch(`https://eagle5.fu.is.saga-u.ac.jp/pss-backend/api/clusters/${selectedCluster}/images`, {
          method: 'DELETE',
        });
        setImages([]); // 画像リストをクリア
        setDisplayedImages([]); // 表示リセット
        setIsDeleted(true);
        alert('クラスタの全画像が削除されました');
      } catch (error) {
        console.error('Error deleting cluster:', error);
      }
    }
  };


  // モーダルをEscapeキーで閉じる
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);


  return (
    
    <div className="container">
      <h1>Image Search</h1>
      <div className="select-container">
        <div className="select-box">
          <label>カメラ選択</label>
          <select value={selectedCamera} onChange={(e) => setSelectedCamera(e.target.value)}>
            <option value="">未選択</option>
            {cameras.map((camera) => (
              <option key={camera} value={camera}>{camera}</option>
            ))}
          </select>
        </div>

        <div className="select-box">
          <label>クラスタ選択</label>
          <select value={selectedCluster} onChange={(e) => setSelectedCluster(e.target.value)} disabled={!selectedCamera}>
            <option value="">未選択</option>
            {clusters.map((cluster) => (
              <option key={cluster} value={cluster}>{cluster}</option>
            ))}
          </select>
        </div>
     

      <div className="select-box">
          <label>期間選択</label>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)}>
            <option value="all">全期間</option>
            <option value="1d">1日前</option>
            <option value="1w">1週間前</option>
            <option value="1m">1か月前</option>
            <option value="6m">半年前</option>
            <option value="1y">1年前</option>
          </select>
        </div>

        <div className="select-box">
          <label>順序選択</label>
          <select value={selectedOrder} onChange={(e) => setSelectedOrder(e.target.value)}>
            <option value="newest">撮影が新しい順</option>
            <option value="oldest">撮影が古い順</option>
          </select>
        </div>
      </div>

      <div className="images-container">
        {displayedImages.length > 0 ? (
          <div>
            <div className="image-grid">
              {displayedImages.map((image) => (
                <div key={image.id} className="image-container">
                  <img
                    src={`https://eagle5.fu.is.saga-u.ac.jp/pss-backend${image.objectImage}`}
                    alt={image.filename}
                    onClick={() => handleImageClick(image.objectImage, image.originalImage, image.filename, image.originalFilename)}
                  />
                  <p>{image.filename}</p>
                  <button onClick={() => handleDeleteImage(image.id)}>画像削除</button>
                </div>
              ))}
            </div>
            <div className="pagination">
              <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                前
              </button>
              <button onClick={() => handlePageChange(currentPage + 1)} disabled={displayedImages.length < imagesPerPage}>
                次
              </button>
            </div>
          </div>
        ) : (
          <p>画像がありません。</p>
        )}
      </div>

      <button onClick={handleDeleteCluster}>クラスタの全画像を削除</button>

      {modalImage && (
  <div className="modal">
    <div className="modal-content">
      <span className="close" onClick={handleCloseModal}>
        &times;
      </span>
      <div className="modal-images">
        <div className="modal-image-container">
          <img src={`https://eagle5.fu.is.saga-u.ac.jp/pss-backend${modalImage.objectImage}`} alt="Object" className="modal-image" />
          <p>{modalImage.objectFilename}</p> {/* 物体画像のファイル名 */}
        </div>
        <div className="modal-image-container">
          <img src={`https://eagle5.fu.is.saga-u.ac.jp/pss-backend${modalImage.originalImage}`} alt="Original" className="modal-image" />
          <p>{modalImage.originalFilename}</p> {/* 元画像のファイル名 */}
        </div>
      </div>
    </div>
  </div>
)}

      {isDeleted && (
        <div>
          <p>画像が削除されました。</p>
        </div>
      )}
    </div>
  );
};

export default ImageDeletion;
