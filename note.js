// note.js
const NoteComponent = {
    props: ['videoCurrentTime', 'jumpToTime'],
    data() {
      return {
        notes: [],
        newNoteText: '',
        newNoteTime: '',
      };
    },
    methods: {
      addNote() {
        if (this.newNoteText.trim() !== '' && this.newNoteTime) {
          this.notes.push({
            text: this.newNoteText,
            time: this.newNoteTime,
          });
          this.newNoteText = '';
          this.newNoteTime = '';
        }
      },
      jumpToNoteTime(time) {
        this.jumpToTime(time);
      },
    },
    template: `
      <div class="notes">
        <h3>笔记</h3>
        <ul>
          <li v-for="(note, index) in notes" :key="index">
            <span @click="jumpToNoteTime(note.time)">
              {{ note.time }} - {{ note.text }}
            </span>
          </li>
        </ul>
        <div>
          <input 
            v-model="newNoteText" 
            placeholder="输入笔记内容" 
          />
          <input 
            v-model="newNoteTime" 
            placeholder="输入时间戳 (例如: 00:01:23)" 
          />
          <button @click="addNote">添加笔记</button>
        </div>
        <note-component :videoCurrentTime="currentTime" :jumpToTime="jumpToTime"></note-component>
      </div>
    `,
  };
  
  // 将组件添加到全局变量中
  window.NoteComponent = NoteComponent;
  