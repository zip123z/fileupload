document.addEventListener('DOMContentLoaded', async () => {
  const fileInput = document.getElementById('fileInput');
  const uploadBtn = document.getElementById('uploadBtn');
  const confirmBtn = document.getElementById('confirmBtn');
  const progressContainer = document.querySelector('.progress-container');
  const progressBar = document.querySelector('.progress-bar');
  const fileList = document.getElementById('fileList');

  let selectedFiles = [];

  // 綁定選擇檔案按鈕點擊事件
  uploadBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // 初始化時載入檔案清單
  await loadFileList();

  const selectedFileList = document.getElementById('selectedFileList');
  const fileInfoContainer = document.querySelector('.file-info-container');

  // 顯示選擇的檔案資訊
  function renderSelectedFiles(files) {
    selectedFileList.innerHTML = '';
    files.forEach(file => {
      const li = document.createElement('li');
      li.className = 'selected-file-item';
      li.innerHTML = `
        <span>${file.name}</span>
        <span>${(file.size / 1024).toFixed(2)} KB</span>
      `;
      selectedFileList.appendChild(li);
    });
  }

  // 檔案選擇處理
  fileInput.addEventListener('change', () => {
    selectedFiles = Array.from(fileInput.files);
    if (selectedFiles.length > 0) {
      // 檢查檔案大小
      const invalidFiles = selectedFiles.filter(file => file.size > 5 * 1024 * 1024);
      if (invalidFiles.length > 0) {
        alert(`以下檔案超過5MB限制：\n${invalidFiles.map(f => f.name).join('\n')}`);
        fileInput.value = ''; // 清除選擇
        selectedFiles = [];
        confirmBtn.style.display = 'none';
        uploadBtn.style.display = 'inline-block';
        fileInfoContainer.style.display = 'none';
        return;
      }
      
      confirmBtn.style.display = 'inline-block';
      uploadBtn.style.display = 'none';
      fileInfoContainer.style.display = 'block';
      renderSelectedFiles(selectedFiles);
    } else {
      fileInfoContainer.style.display = 'none';
    }
  });

  // 確認上傳
  confirmBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    // 驗證檔案大小
    for (const file of selectedFiles) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`檔案 ${file.name} 超過5MB限制`);
        return;
      }
    }

    // 顯示進度條
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';

    try {
      const formData = new FormData();
      for (const file of selectedFiles) {
        formData.append('files', file);
      }

      const xhr = new XMLHttpRequest();
      
      // 上傳進度處理
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          progressBar.style.width = `${percent}%`;
        }
      });

      // 上傳完成處理
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          alert('檔案上傳成功！');
          window.location.reload(); // 刷新頁面
        } else {
          throw new Error('上傳失敗');
        }
      });

      xhr.open('POST', '/upload');
      xhr.send(formData);
    } catch (error) {
      console.error('上傳錯誤:', error);
      alert('上傳失敗，請稍後再試');
      progressContainer.style.display = 'none';
    }
  });

  // 載入檔案清單
  async function loadFileList() {
    try {
      const response = await fetch('/files');
      const files = await response.json();
      renderFileList(files);
    } catch (error) {
      console.error('載入檔案清單失敗:', error);
    }
  }

  // 渲染檔案列表
  function renderFileList(files) {
    fileList.innerHTML = '';
    
    if (files.length === 0) {
      const emptyMsg = document.createElement('li');
      emptyMsg.className = 'empty-message';
      emptyMsg.textContent = '尚無附檔';
      fileList.appendChild(emptyMsg);
      return;
    }
    
    files.forEach(file => {
      const li = document.createElement('li');
      li.className = 'file-item';

      if (file.type.startsWith('image/')) {
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container';
        
        const img = document.createElement('img');
        img.src = file.url;
        img.alt = file.name;
        img.className = 'file-image';
        
        // 添加點擊事件處理
        img.addEventListener('click', () => showLightbox(file.url));
        
        imgContainer.appendChild(img);
        li.appendChild(imgContainer);
      } else {
        const link = document.createElement('a');
        link.href = file.url;
        link.className = 'download-link';
        link.textContent = file.name;
        link.download = file.name;
        li.appendChild(link);
      }

      // 加入檔案資訊
      const info = document.createElement('div');
      info.className = 'file-info';
      info.innerHTML = `
        <span>${file.name}</span>
        <span>${(file.size / 1024).toFixed(2)} KB</span>
        <span>${new Date(file.date).toLocaleString()}</span>
      `;
      li.appendChild(info);

      // 加入刪除按鈕
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '刪除';
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`確定要刪除 ${file.name} 嗎？`)) {
          try {
            const filename = file.url.split('/').pop();
            const response = await fetch(`/files/${filename}`, {
              method: 'DELETE'
            });
            
            if (response.ok) {
              li.remove();
            } else {
              throw new Error('刪除失敗');
            }
          } catch (error) {
            console.error('刪除錯誤:', error);
            alert('刪除檔案失敗');
          }
        }
      });
      li.appendChild(deleteBtn);

      fileList.appendChild(li);
    });
  }

  // Lightbox功能
  function showLightbox(imageUrl) {
    // 創建lightbox容器
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    
    // 創建圖片元素
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = '放大圖片';
    
    // 添加關閉按鈕
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(lightbox);
    });
    
    // 點擊背景關閉
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) {
        document.body.removeChild(lightbox);
      }
    });
    
    // 添加元素到lightbox
    lightbox.appendChild(img);
    lightbox.appendChild(closeBtn);
    
    // 添加到body
    document.body.appendChild(lightbox);
  }
});
