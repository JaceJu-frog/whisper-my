const { createApp } = Vue;

const App = {
  data() {
    return {
      videoSrc: "",
      videoPlayer: null,
      subtitles: [],
      currentTime: 0,
      editingIndex: -1, // 用于存储当前正在编辑的字幕索引
      editedText: "", // 用于存储正在编辑的字幕文本
      splittingIndex: -1, // 用于存储当前正在分割的字幕索引
      excludedSubtitles: [], // 存储被排除的字幕索引
      splitTime: "", // 用于存储分割时间
      showSubtitles: true, // 控制字幕的显示和隐藏
      vttBlobUrl: "", // 存储生成的 VTT 文件的 Blob URL
      showFineTune: false, // 控制微调面板的显示和隐藏
      activeTab: "subtitles", // 新增：控制标签页的切换
      isResizing: false, // 新增：控制是否正在拖动分隔线
    };
  },
  methods: {
    // 处理视频上传事件。首先获取上传的文件，然后将其转换为URL对象，存储在组件的videoSrc属性中。
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.videoSrc = URL.createObjectURL(file);
      }
    },

    // 处理字幕上传事件。首先获取上传的文件，然后创建一个FileReader对象，并设置其onload事件处理程序，
    // 当文件读取完成后执行。在onload事件处理程序中，调用parseSRT方法处理读取到的文本数据。
    handleSubtitleUpload(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.parseSRT(e.target.result);
          this.generateVTT(); // 加载字幕后生成 VTT 文件
        };
        reader.readAsText(file);
      }
    },

    // 处理字幕下载
    downloadSubtitles() {
      let srtContent = "";
      this.subtitles.forEach((sub, index) => {
        // 检查当前字幕索引是否在排除列表中
        if (!this.excludedSubtitles.includes(index)) {
          srtContent += `${index + 1}\n${new Date(sub.startTime * 1000)
            .toISOString()
            .substr(11, 12)
            .replace(".", ",")} --> ${new Date(sub.endTime * 1000)
            .toISOString()
            .substr(11, 12)
            .replace(".", ",")}\n${sub.text}\n\n`;
        }
      });
    
      // 创建一个隐藏的a标签来触发下载
      const link = document.createElement("a");
      const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
      link.href = URL.createObjectURL(blob);
      link.download = "subtitles.srt";
      link.click();
      URL.revokeObjectURL(link.href);
    },

    // 解析SRT格式的字幕数据。首先定义一个正则表达式，用于匹配SRT字幕中的时间信息和文本信息。
    // 然后使用exec方法在data中查找匹配项，将其转换为秒数，并将其添加到subtitles数组中。
    parseSRT(data) {
      const regex =
        /\d+\n(\d{2}:\d{2}:\d{2}[.,]\d{3}) --> (\d{2}:\d{2}:\d{2}[.,]\d{3})\n([\s\S]*?)\n{2,}/g;
      let match;
      this.subtitles = [];
      while ((match = regex.exec(data)) !== null) {
        const timePartsStart = match[1].split(":");
        // console.log(match[1])
        const secondsStart =
          +timePartsStart[0] * 3600 +
          +timePartsStart[1] * 60 +
          +parseFloat(timePartsStart[2].replace(/,/, "."));
        //   console.log(timePartsStart[0] * 3600,timePartsStart[1] * 60,parseFloat(timePartsStart[2]))
        //   console.log(timePartsStart[2])

        const timePartsEnd = match[2].split(":");
        const secondsEnd =
          +timePartsEnd[0] * 3600 +
          +timePartsEnd[1] * 60 +
          +parseFloat(timePartsEnd[2]);

        this.subtitles.push({
          startTime: secondsStart,
          endTime: secondsEnd,
          text: match[3].trim(),
        });
      }
    },

    // 获取组件的videoPlayer引用，将其currentTime属性设置为给定的秒数。
    jumpToTime(seconds) {
      const video = this.$refs.videoPlayer;
      if (video) {
        video.currentTime = seconds;
      }
    },

    // 获取组件的videoPlayer引用，将其currentTime属性设置为videoPlayer的currentTime属性值，
    // 然后调用scrollToSubtitle方法。
    updateCurrentTime() {
      const video = this.$refs.videoPlayer;
      if (video) {
        this.currentTime = video.currentTime;
        this.scrollToSubtitle();
      }
    },

    // 获取组件的subtitleList引用，以及subtitles数组中的当前时间对应的字幕索引。
    // 如果找到了这个索引，并且subtitleList存在，那么将subtitleList的scrollTop属性设置为该字幕的offsetTop减去subtitleList的offsetTop。
    scrollToSubtitle() {
      const subtitleList = this.$refs.subtitleList;
      const activeSubtitleIndex = this.subtitles.findIndex(
        (subtitle) => this.currentTime >= subtitle.time
      );
      if (activeSubtitleIndex !== -1 && subtitleList) {
        const activeSubtitle = subtitleList.children[activeSubtitleIndex];
        if (activeSubtitle) {
          subtitleList.scrollTop =
            activeSubtitle.offsetTop - subtitleList.offsetTop;
        }
      }
    },

    // 设置当前正在编辑的字幕索引，并存储其文本内容，切换到编辑模式。
    editSubtitle(index) {
      this.editingIndex = index;
      this.editedText = this.subtitles[index].text;
    },

    // 保存编辑后的字幕文本，并退出编辑模式。
    saveSubtitle(index) {
      if (this.editedText.trim() !== "") {
        this.subtitles[index].text = this.editedText.trim();
      }
      this.editingIndex = -1;
      this.generateVTT(); // 保存字幕后重新生成 VTT 文件
    },

    // 取消字幕编辑，退出编辑模式而不保存更改。
    cancelEdit() {
      this.editingIndex = -1;
    },

    // 生成用于浏览器展示的vtt文件
    generateVTT() {
      let vttContent = "WEBVTT\n\n";
      this.subtitles.forEach((sub) => {
        vttContent += `${new Date(sub.startTime * 1000)
          .toISOString()
          .substr(11, 12)} --> ${new Date(sub.endTime * 1000)
          .toISOString()
          .substr(11, 12)}\n${sub.text}\n\n`;
      });

      const blob = new Blob([vttContent], { type: "text/vtt" });
      this.vttBlobUrl = URL.createObjectURL(blob);
    },

    // 是否在视频中显示字幕。
    toggleSubtitles() {
      this.showSubtitles = !this.showSubtitles;
    },

    // 字幕时间微调
    toggleFineTune() {
      this.showFineTune = !this.showFineTune;
      this.fineTuneIndex = -1; // 关闭时清除选择
      this.fineTuneType = null; // 清除微调类型
    },

    startFineTune(index, type) {
      if (!this.showFineTune) return;
      this.fineTuneIndex = index;
      this.fineTuneType = type;
    },

    fineTuneSubtitle(event) {
      if (this.fineTuneIndex === -1 || !this.fineTuneType) return;

      const subtitle = this.subtitles[this.fineTuneIndex];
      const step = 0.1; // 每次微调 0.1 秒

      if (event.key === "ArrowLeft") {
        if (this.fineTuneType === "start") {
          subtitle.startTime = Math.max(0, subtitle.startTime - step);
        } else if (this.fineTuneType === "end") {
          subtitle.endTime = Math.max(
            subtitle.startTime,
            subtitle.endTime - step
          );
        }
      } else if (event.key === "ArrowRight") {
        if (this.fineTuneType === "start") {
          subtitle.startTime += step;
        } else if (this.fineTuneType === "end") {
          subtitle.endTime += step;
        }
      }

      // 调整前一个字幕的结束时间
      if (this.fineTuneIndex > 0) {
        const prevSubtitle = this.subtitles[this.fineTuneIndex - 1];
        if (subtitle.startTime > prevSubtitle.startTime) {
          prevSubtitle.endTime = subtitle.startTime;
        } else if (subtitle.startTime < prevSubtitle.startTime) {
          console.log(
            "本行字幕开始时间小于上一行字幕的开始时间，请先调整上一行"
          );
        }
      }

      // 调整后一个字幕的开始时间
      if (this.fineTuneIndex < this.subtitles.length - 1) {
        const nextSubtitle = this.subtitles[this.fineTuneIndex + 1];
        if (subtitle.endTime < nextSubtitle.endTime) {
          nextSubtitle.startTime = subtitle.endTime;
        } else if (subtitle.endTime > nextSubtitle.endTime) {
          console.log(
            "本行字幕结束时间超过下一行字幕的结束时间，请先调整下一行"
          );
        }
      }

      this.generateVTT(); // 更新字幕文件
    },

    // 双击时间后分割字幕，弹出输入框让用户输入分割时间
    splitSubtitle(index) {
      // 将当前字幕的结束时间格式化为 hh:mm:ss.mmm
      const endTime = this.subtitles[index].endTime;
      const hours = Math.floor(endTime / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((endTime % 3600) / 60).toString().padStart(2, '0');
      const seconds = (endTime % 60).toFixed(3).padStart(6, '0');
      const defaultSplitTime = `${hours}:${minutes}:${seconds}`;

      const splitTimeInput = prompt("请输入分割时间（格式为 hh:mm:ss.mmm）：", defaultSplitTime);
      this.splittingIndex = index;
      if (splitTimeInput) {
        const timeParts = splitTimeInput.split(":");
        const splitSeconds =
          +timeParts[0] * 3600 + +timeParts[1] * 60 + +parseFloat(timeParts[2]);

        if (
          splitSeconds > this.subtitles[index].startTime &&
          splitSeconds < this.subtitles[index].endTime
        ) {
          // 创建新的字幕部分
          const newSubtitle = {
            startTime: splitSeconds,
            endTime: this.subtitles[index].endTime,
            text: this.subtitles[index].text,
          };

          // 更新当前字幕的结束时间
          this.subtitles[index].endTime = splitSeconds;
          this.subtitles[index].text = this.editedText.trim();

          // 将新字幕插入到数组中，紧接在当前字幕之后
          this.subtitles.splice(index + 1, 0, newSubtitle);
          this.generateVTT(); // 分割字幕后重新生成 VTT 文件
        } else {
          alert("输入的分割时间不在当前字幕的时间范围内。");
        }
      }
      this.splittingIndex = -1;
    },

    // 删除字幕
    deleteSubtitle(index) {
      this.subtitles.splice(index, 1);
      this.generateVTT(); // 删除字幕后重新生成 VTT 文件
    },
    // 切换标签页
    switchTab(tab) {
      this.activeTab = tab;
    },

    startResize(event) {
      this.isResizing = true;
      this.initialMouseX = event.clientX;
      this.initialWidth1 = this.$refs.resizablePart1.offsetWidth;
      this.initialWidth2 = this.$refs.resizablePart2.offsetWidth;
    },
    onResize(event) {
      if (this.isResizing) {
        const delta = event.clientX - this.initialMouseX;
        this.$refs.resizablePart1.style.width = `${this.initialWidth1 + delta}px`;
        this.$refs.resizablePart2.style.width = `${this.initialWidth2 - delta}px`;
      }
    },
    stopResize() {
      this.isResizing = false;
    },

    toggleExclude(index) {
      const indexExists = this.excludedSubtitles.includes(index);
      if (indexExists) {
        this.excludedSubtitles.splice(this.excludedSubtitles.indexOf(index), 1);
      } else {
        this.excludedSubtitles.push(index);
      }
    },
  },

  mounted() {
    this.videoPlayer = videojs(this.$refs.videoPlayer, {
      controls: true,
      preload: 'auto'
    });
    window.addEventListener("mousemove", this.onResize);
    window.addEventListener("mouseup", this.stopResize);
    window.addEventListener("keydown", this.fineTuneSubtitle);
  },
  beforeDestroy() {
    window.removeEventListener("mousemove", this.onResize);
    window.removeEventListener("mouseup", this.stopResize);
    window.removeEventListener("keydown", this.fineTuneSubtitle);
  },
  components: {
    NoteComponent: window.NoteComponent,
  },

  template: `
    <div id="app">
      <div class="resizable-container">
        <div class="video-part" ref="resizablePart1">
          <input type="file" @change="handleFileUpload">
          
          <video 
            ref="videoPlayer"
            class="video-js"
            controls
            width="500px"
            preload="auto"
            :src="videoSrc"
            @timeupdate="updateCurrentTime" 
          >
            <track 
              v-if="showSubtitles && vttBlobUrl" 
              kind="subtitles" 
              :src="vttBlobUrl" 
              srclang="en" 
              label="English" 
              default
            >
          </video>
          <br>
          <button @click="toggleSubtitles">{{ showSubtitles ? '隐藏字幕' : '显示字幕' }}</button>
          <button @click="toggleFineTune">{{ showFineTune ? '关闭微调' : '字幕微调' }}</button>
          <button @click="downloadSubtitles">下载字幕</button>
        </div>
        <div class="resizer" @mousedown="startResize"></div>
        <div class = "sider" ref="resizablePart2">
          <div class="tabs">
            <button :class="{ active: activeTab === 'subtitles' }" @click="switchTab('subtitles')">字幕</button>
            <button :class="{ active: activeTab === 'notes' }" @click="switchTab('notes')">笔记</button>
          </div>
          <div v-if="activeTab === 'subtitles'" class="subtitles">
            <input type="file" @change="handleSubtitleUpload" accept=".srt">
            <ul v-if="subtitles.length" class="subtitle-list" ref="subtitleList">
              <li 
                v-for="(subtitle, index) in subtitles" 
                :key="index" 
                :class="{ active: currentTime >= subtitle.startTime && currentTime <= subtitle.endTime, excluded: this.excludedSubtitles.includes(index) }"
                
              >
                <strong @click="jumpToTime(subtitle.startTime)">
                  <span @dblclick="startFineTune(index, 'start')">
                    {{ new Date(subtitle.startTime * 1000).toISOString().substr(11, 12) }}
                  </span>
                  --> 
                  <span @dblclick="startFineTune(index, 'end')">
                    {{ new Date(subtitle.endTime * 1000).toISOString().substr(11, 12) }}
                  </span>
                </strong>:
                <span v-if="editingIndex !== index" @dblclick="editSubtitle(index)">
                  {{ subtitle.text || 'Double-click to edit' }}
                </span>
                <textarea 
                  v-else 
                  v-model="editedText" 
                  @keyup.enter="saveSubtitle(index)" 
                  @blur="saveSubtitle(index)" 
                  @keyup.esc="cancelEdit"
                  class="edit-textarea"
                ></textarea>
                <button @click="splitSubtitle(index)">分割字幕</button>
                <button class="deleteSubtitle" @click="deleteSubtitle(index)"></button>
                <button class="toggle-exclude" :class="{ selected: this.excludedSubtitles.includes(index) }" @click="toggleExclude(index)"></button>
                <span v-if="fineTuneIndex === index" class="fine-tune-feedback">
                  微调中: {{ new Date(subtitle.startTime * 1000).toISOString().substr(11, 8) }} --> {{ new Date(subtitle.endTime * 1000).toISOString().substr(11, 8) }}
                </span>
              </li>
            </ul>
          </div>
          <div v-if="activeTab === 'notes'" class="notes">
            <note-component :videoCurrentTime="currentTime" :jumpToTime="jumpToTime"></note-component>
          </div>
        </div>
      </div>
    </div>
  `,
};

const vm = createApp(App).mount("#app");
window.vm = vm; // 将实例赋值给全局变量

// 我们在 createApp(App).mount("#app") 之后添加了 window.vm = vm;。
// 这样，你就可以在浏览器控制台中使用 vm 来访问 Vue 组件实例，并查看或修改 this.subtitles 的值。
