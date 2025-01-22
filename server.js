const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// 初始化目錄和檔案清單
const uploadDir = path.join(__dirname, 'uploads');
const fileListPath = path.join(__dirname, 'fileList.json');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

let fileList = [];
if (fs.existsSync(fileListPath)) {
  fileList = JSON.parse(fs.readFileSync(fileListPath));
}

// 設定multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 處理中文檔名
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + originalName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
});

// 啟用CORS
app.use(cors());

// 靜態檔案服務
app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadDir));

// 根路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 取得檔案清單
app.get('/files', (req, res) => {
  res.json(fileList);
});

// 檔案上傳路由
app.post('/upload', upload.array('files'), (req, res) => {
  try {
    const files = req.files.map(file => {
      // 處理中文檔名顯示
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      
      const fileInfo = {
        name: originalName,
        type: file.mimetype,
        size: file.size,
        url: `/uploads/${file.filename}`,
        date: new Date().toISOString()
      };
      
      fileList.push(fileInfo);
      fs.writeFileSync(fileListPath, JSON.stringify(fileList, null, 2));
      
      return fileInfo;
    });

    res.status(200).json(files);
  } catch (error) {
    console.error('檔案上傳錯誤:', error);
    res.status(500).send('檔案上傳失敗');
  }
});

// 檔案刪除路由
app.delete('/files/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // 從檔案清單中移除
    const index = fileList.findIndex(file => file.url === `/uploads/${filename}`);
    if (index === -1) {
      return res.status(404).json({ error: '檔案不存在' });
    }
    
    // 刪除實際檔案
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      
      // 更新檔案清單
      fileList.splice(index, 1);
      fs.writeFileSync(fileListPath, JSON.stringify(fileList, null, 2));
      
      res.json({ success: true });
    } else {
      res.status(404).json({ error: '檔案不存在' });
    }
  } catch (error) {
    console.error('刪除檔案失敗:', error);
    res.status(500).json({ error: '刪除檔案失敗' });
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行在 http://localhost:${PORT}`);
});
