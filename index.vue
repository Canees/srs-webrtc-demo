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
      <button @click="contrl(8)">
        上
      </button>
      <button @click="contrl(2)">
        下
      </button>
      <button @click="contrl(4)">
        左
      </button>
      <button @click="contrl(6)">
        右
      </button>
      <button @click="contrl(10)">
        放大
      </button>
      <button @click="contrl(11)">
        缩小
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import axios from 'axios'
import { onMounted, onUnmounted, ref } from 'vue'
let webRtc: any = null
const TOKEN = '833cd2ff8851509d0c4b2cab0dbdb74d'
const cList = ref()
const cUUID = ref('')
let timer:any = null
/**
 * rtc 初始化
 * @param HOST
 * @param token
 * @param uuid
 * @param callBack
 * @param profile 0 主 1 子
 */
const initWebRtc = async (HOST: String, token: String, uuid: string, callBack: Function, profile = 0) => {
  try {
    // init RTC
    const Peer = new RTCPeerConnection() as any
    // Peer.addTransceiver('audio', { direction: 'recvonly' })
    Peer.addTransceiver('video', { direction: 'recvonly' })
    const offer = await Peer.createOffer()
    await Peer.setLocalDescription(offer)
    // 监听视频
    Peer.ontrack = callBack

    Peer.oniceconnectionstatechange = () => {
      const state = Peer.iceConnectionState
      console.log('ICE状态', state)
    }

    Peer.onicegatheringstatechange = () => {
      console.log('GatheringState: ', Peer.iceGatheringState)
    }

    Peer.onconnectionstatechange = () => {
      const state = Peer.connectionState
      console.log('连接状态', state)
    }
    // SDP SRS params
    const params = {
      api: `http://${HOST}:1985/rtc/v1/play/?token=${token}&uuid=${uuid}&stream=${uuid + profile}&profile=${profile}`,
      clientip: null,
      sdp: offer.sdp,
      streamurl: `webrtc://${HOST}/live/${uuid + profile}?token=${token}&uuid=${uuid}&stream=${uuid + profile}&profile=${profile}`,
      tid: Number(Math.floor(new Date().getTime() * Math.random() * 100)).toString(16).slice(0, 7)
    }
    console.log('params', params)

    // 发送offer
    const res = await window.fetch(params.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })

    // 接收 answer
    const { sdp } = await res.json()
    if (sdp) await Peer.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }))

    return Peer
  } catch (error) {
    return null
  }
}

/**
 * 云台控制
 * @param command 指令:数字键盘1-9去掉5,10:焦距放大,11:焦距缩小 12:亮度,13:色彩饱和度,14:对比度,15:清晰度
 * @param number [云台速度|焦距参数|色彩饱和度]等值  亮度值 0-100
 */
const contrl = (command: number, number = 1) => {
  if (!cUUID.value) return
  if (timer !== null) clearTimeout(timer)
  timer = setTimeout(() => {
    window.fetch('http://20.20.20.9:8089', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: 'cloudcontrol.control',
        token: TOKEN,
        body: {
          uuid: cUUID.value, // 摄像头id
          command,
          number // [云台速度|焦距参数|色彩饱和度]等值  亮度值 0-100
        }
      })
    })
  }, 500)
}

/**
 * 播放
 * @param uuid
 */
const play = async (uuid: string) => {
  if (!uuid) return
  if (uuid === cUUID.value) return
  if (webRtc) webRtc.close()
  cUUID.value = uuid
  webRtc = await initWebRtc('20.20.20.9', TOKEN, uuid, (event: any) => {
    const dom = document.getElementById('test') as any
    const { streams } = event
    dom.srcObject = streams[0]
    console.log('track', event)
  })
}

// 获取摄像头播放地址
const getCamer = async () => {
  const { data } = await axios.post('http://20.20.20.9:8089', {
    code: 'categorycamera.list',
    token: TOKEN,
    body: {}
  })
  // 35可控
  cList.value = data.filter((el: { name: string }) => (el.name.includes('35')))
  console.log('摄像头列表', cList.value)
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

onUnmounted(() => {
  if (webRtc) webRtc.close()
  if (timer) window.clearTimeout(timer)
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
