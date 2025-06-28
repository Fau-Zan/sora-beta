import { log } from 'console';
import y2mate from "./lib/plugins/youtube"

//const p = await y2mate("pRfmrE0ToTo")
// log(p)

function getYoutubeId(url) {
    const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/mi;
    const match = url.match(regex);
    return match && match[1] ? match[1] : null;
  }
log(await y2mate(getYoutubeId("https://youtu.be/oOi3oJmfz4o?si=ywKWd4bigZINlskJ")))
process.exit()