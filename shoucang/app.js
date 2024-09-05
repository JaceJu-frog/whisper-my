// Sample JSON structure
const videoData = {
    "分类1": [
        { "name": "这是一个视频名称", "pic_url": "https://example.com/image1.jpg" },
        { "name": "另一个视频", "pic_url": "https://example.com/image2.jpg","video_url": "http://127.0.0.1:8000/file/E:/Downloads/8月29日-副本.mp4" },
        
    ],
    "分类2": [
        { "name": "分类二视频", "pic_url": "https://example.com/image3.jpg" }
    ],
    "分类3": [
        { "name": "分类三视频", "pic_url": "https://example.com/image4.jpg" }
    ]
};

// Get HTML elements
const categoriesElement = document.getElementById("categories");
const videosElement = document.getElementById("videos");

// Populate categories in the sidebar
Object.keys(videoData).forEach(category => {
    const li = document.createElement("li");
    li.textContent = category;
    li.addEventListener("click", () => displayVideos(category));
    categoriesElement.appendChild(li);
});


function displayVideos(category) {
    videosElement.innerHTML = "";  // 清除之前的视频
    videoData[category].forEach(video => {
        const videoCard = document.createElement("div");
        videoCard.classList.add("video-card");

        const img = document.createElement("img");
        img.src = video.pic_url;

        const a = document.createElement("a");
        a.href = video.video_url;
        a.target = "_blank";  // 在新标签页打开链接
        const title = document.createElement("h3");
        title.textContent = video.name;
        a.appendChild(title);

        videoCard.appendChild(img);
        videoCard.appendChild(a);
        videosElement.appendChild(videoCard);
    });
}
