<template>
  <div class="videoBox">
    <div class="box">
      <div class="list">
        <ul>
          <li
            v-for="(item, index) in cList"
            :key="index"
            @click="play(item.uuid)"
          >
            {{ item.name }}
          </li>
        </ul>
      </div>
      <video
        id="test"
        crossorigin="anonymous"
        autoplay
        playsinline
        muted
        controls
      />
    </div>

    <div class="contrl">
      <n-button @click="contrl(8)">
        上
      </n-button>
      <n-button @click="contrl(2)">
        下
      </n-button>
      <n-button @click="contrl(4)">
        左
      </n-button>
      <n-button @click="contrl(6)">
        右
      </n-button>
      <n-button @click="contrl(10)">
        放大
      </n-button>
      <n-button @click="contrl(11)">
        缩小
      </n-button>
      <n-button @click="capPhoto">
        截图
      </n-button>
      <n-button @click="capVideo">
        录像
      </n-button>
    </div>
  </div>
</template>
<script setup lang="ts">
import axios from '@/utils/axios'
import { onMounted, ref } from 'vue'
import WebRtcPlayer from '@/utils/SRSWebRtcPlayer'

const TOKEN = '2fc01ae175e8676b6a3edc32d2d76cb3'
const cList = ref()
const CUUID = ref('')
let play1 = null as any

// 获取摄像头播放地址
const getCamer = async () => {
  const { data } = await axios.post('http://47.108.192.202:8089', {
    code: 'categorycamera.list',
    token: TOKEN,
    body: {}
  })
  // 35可控
  // cList.value = data.filter((el: { name: string }) => (el.name.includes('35')))
  cList.value = data
  console.log('摄像头列表', cList.value)
}

// 播放
const play = async (uuid: string) => {
  if (play1) play1.close()
  CUUID.value = uuid
  play1 = new WebRtcPlayer({
    HOST: '47.108.192.202',
    TOKEN,
    UUID: uuid,
    PROFILE: 0,
    PORT: 1985,
    DOM: document.getElementById('test')
  })
}

/**
 * 云台控制
 * @param command 指令:数字键盘1-9去掉5,10:焦距放大,11:焦距缩小 12:亮度,13:色彩饱和度,14:对比度,15:清晰度
 * @param number [云台速度|焦距参数|色彩饱和度]等值  亮度值 0-100
 */
const contrl = (command: number, number = 1) => {
  if (!play1) return
  play1.contrl('http://47.108.192.202:8089', CUUID.value, TOKEN, command, number)
}

// 截图
const capPhoto = () => {
  if (!play1) return
  const base64 = play1.capPhoto(document.getElementById('test'))
  console.log('截图', base64)
}

// 录像
const capVideo = async () => {
  if (!play1) return
  const blob = await play1.capVideo(document.getElementById('test'), 1000 * 5)
  console.log('录像', blob)
}

// 获取目录
// const proList = async () => {
//   const { data } = await axios.post('http://20.20.20.9:8089', {
//     code: 'category.list',
//     token: '833cd2ff8851509d0c4b2cab0dbdb74d',
//     body: {}
//   })
//   // 零食取一个测试
//   console.log(666, data)
// }

onMounted(() => {
  getCamer()
})

</script>
<style lang="less" scoped>
.videoBox {
  .box {
    display: flex;
    justify-content: center;

    .list {
      width: 150px;
      color: white;

      li {
        padding: 10px;

        &:hover {
          color: aqua;
          cursor: pointer;
        }
      }
    }

    video {
      width: 800px;
      height: 500px;
      background: none;
      object-fit: fill;
      font-size: 0;
    }
  }

  .contrl {
    margin-top: 10px;
    text-align: center;

    button {
      margin-left: 10px;
    }
  }
}
</style>