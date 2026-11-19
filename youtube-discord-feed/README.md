# GitHub YouTube Discord Feed

이 폴더는 [mouryaabhay/youtube-discord-feed](https://github.com/mouryaabhay/youtube-discord-feed)를 기반으로 가져온 GitHub Actions용 YouTube → Discord 알림 프로젝트입니다. 기존 GitHub Pages 사이트와 독립된 하위 프로젝트로 운영합니다. 원본은 여러 채널의 YouTube RSS를 확인하고 Discord Webhook 임베드와 영상 버튼을 게시하며, 채널별 상태를 저장하고 일시적인 피드 오류를 재시도합니다.

## 설정

1. [src/configs/youtubeChannelsConfig.json](src/configs/youtubeChannelsConfig.json)의 `channels` 배열에 감시할 채널을 추가합니다.

   ```json
   {
     "channels": [
       {
         "name": "채널 이름",
         "channelId": "UCxxxxxxxxxxxxxxxxxxxxxx",
         "color": "#ED4245",
         "enabled": true
       }
     ]
   }
   ```

   `channelId`에는 `UC`로 시작하는 YouTube 채널 ID를 입력합니다. 감시 채널은 기본으로 비워 두었습니다.

2. GitHub 저장소의 **Settings → Secrets and variables → Actions → Secrets**에 `DISCORD_WEBHOOK_URL`을 추가합니다. 역할 멘션이 필요하면 `DISCORD_ROLE_ID`도 Secret으로 설정할 수 있습니다.
3. **Settings → Actions → General → Workflow permissions**에서 `Read and write permissions`를 허용합니다. 워크플로가 영상 상태와 채널 핸들 캐시를 커밋하는 데 필요합니다.
4. **Actions → YouTube New Video Notifier → Run workflow**로 첫 실행을 시작합니다.

첫 실행은 채널당 최신 영상 하나를 게시하고 기준 상태로 저장합니다. 이후 실행은 마지막으로 보낸 영상 뒤에 올라온 영상을 오래된 순서대로 게시합니다. 자동 확인은 30분마다 실행됩니다. GitHub 예약 실행은 부하에 따라 지연될 수 있습니다.

## 로컬 실행

Node.js 20 이상에서 다음 명령으로 실행할 수 있습니다.

```sh
cd youtube-discord-feed
npm ci
```

`.env.example`을 `.env`로 복사해 Webhook 값을 채운 다음 `npm start`를 실행합니다. `.env`는 커밋하지 마세요.

원본 프로젝트의 MIT 라이선스는 [LICENSE](LICENSE)에 포함되어 있습니다.
