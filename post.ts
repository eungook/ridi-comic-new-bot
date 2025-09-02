/**
 * 블루스카이 포스팅 관련 코드
 */

import { AtpAgent, BlobRef, RichText } from "@atproto/api";
import sharp from "sharp";

// Create a Bluesky Agent
const agent = new AtpAgent({
    service: 'https://bsky.social',
});

// Login
const opts = {
    identifier: process.env.BLUESKY_USERNAME!,
    password: process.env.BLUESKY_PASSWORD!,
};
// console.log({ opts });
await agent.login(opts);

// Post
// await agent.post({
//     text: 'Hello, world!', // 잘 써진다!
// });

// await agent.post({
//     text: 'https://ridibooks.com/books/297083370' // URL은 카드 등으로 치환되지 않고 그대로 출력된다.
// });

// await agent.post({
//     text: 'Hello, world! this is text.',
//     embed: {
//         $type: 'app.bsky.embed.external',
//         external: {
//             uri: 'https://ridibooks.com/books/297083370',
//             title: 'Hello, world! this is title.',
//             description: 'Hello, world! this is description.',
//         },
//     }
// });
// - embed로 했더니 카드가 생기긴 하는데 OG 데이터를 내가 다 수집해줘야 한다..
// - 다른 신간 봇 처럼 그냥 링크를 올리고, 이미지를 첨부하는게 더 나을 것 같다

// const richText = new RichText({
//     text: 'Hello, world! this is text.',
// });


// const encoder = new TextEncoder()
// const decoder = new TextDecoder()

// class UnicodeString {
//   utf16: string
//   utf8: Uint8Array

//   constructor(utf16: string) {
//     this.utf16 = utf16
//     this.utf8 = encoder.encode(utf16)
//   }

//   // helper to convert utf16 code-unit offsets to utf8 code-unit offsets
//   utf16IndexToUtf8Index(i: number) {
//     return encoder.encode(this.utf16.slice(0, i)).byteLength
//   }
// }

// const message = '안녕하세요, 반갑습니다.';
// const unicodeString = new UnicodeString(message);
// const byteStart = unicodeString.utf16IndexToUtf8Index(message.length);

// // const byteStart = message.length;

// await agent.post({
//     text: `${message} [링크]`,
//     facets: [
//       {
//         index: {
//           byteStart: byteStart + 1,
//           byteEnd: byteStart + 1 + 8
//         },
//         features: [{
//           $type: 'app.bsky.richtext.facet#link',
//           uri: 'https://ridibooks.com/books/297083370'
//         }]
//       }
//     ]
// });
// - 이렇게 하니까 본문 내 링크가 된다.. 근데 영 불편하군
// - 이럴거면 그냥 카드를 써..?


const url = 'https://img.ridicdn.net/cover/297083370/large?dpi=xhdpi#1'; // 220x310
const response = await fetch(url);
const blob = await response.blob();
const buffer = await blob.arrayBuffer();

// note: 세로로 긴 이미지의 위아래를 약간 잘라내고, 좌우에 여백을 두려고 함
const resized1 = await sharp(buffer)
    .resize({
        width: 269,
        height: 269,
    })
    .toBuffer();

// note: resize는 chaining으로 하면 한 번만 적용된다. 그래서 굳이 buffer로 만들어 두 번 해야 한다.
const resized2 = await sharp(resized1)
    .resize({
        width: 513,
        height: 269,
        fit: 'contain',
        background: '#FFF',
    })
    .toBuffer();

const thumb = await agent.uploadBlob(resized2);
console.log({ thumb }); // 업로드 잘 된다!

await agent.post({
    text: `<<외톨이에는 익숙하니까요. 약혼자 방치 중! 2권>>
하레타 준 글, 그림 | 아라세 야히로 원작 | 대원씨아이 출판`, // 줄내림도 잘 된다
    embed: {
        $type: 'app.bsky.embed.external',
        external: {
            uri: 'https://ridibooks.com/books/297083370', // facets로 넣는 링크와는 달리, 얘는 외부 사이트 이동에 대한 경고가 없다. 좋네..
            title: '외톨이에는 익숙하니까요. 약혼자 방치 중! 2권',
            description: '', // description은 없으면 알아서 해당 영역이 감춰진다
            thumb: thumb.data.blob,
        },
    }
});
// - 오 정말.. 썸네일만 가져오면 되겠다
// - 이제 썸네일도 잘 들어간다!

// - 이미지와 카드가 같이 있을 수 있나..?


// Logout
await agent.logout();