# watchtogether

## Деплой

1. Запушить этот репозиторий в свой GitHub, заменить `YOUR_GH_USER` в
   `proxmox/create-ct.sh` и `proxmox/install-inside-ct.sh` на свой юзернейм.
2. На хосте Proxmox:
   ```
   bash -c "$(curl -fsSL https://raw.githubusercontent.com/YOUR_GH_USER/watchtogether/main/proxmox/create-ct.sh)"
   ```
3. В NPMplus: proxy host на IP контейнера, порт 8080, включить
   "Websockets Support" в настройках прокси-хоста — без этого сломается
   и комнатный WebSocket, и сам UV-прокси (bare-server тоже держит
   WebSocket upgrade).
4. Проброс через frp — обычный TCP/HTTP проброс на 80/443 к NPMplus,
   как для остальных сервисов. WebSocket проходит поверх HTTP upgrade,
   отдельный порт не нужен.

## Известные ограничения MVP

- Кинопоиск и подобные DRM-защищённые плееры пойдут через общий прокси
  как обычный сайт — если сработает анти-бот/Widevine-защита, плеер не
  запустится. Отдельного фикса под них нет.
- Один `<video>` на странице определяется автоматически (включая
  вложенные iframe). Если на странице несколько video-элементов
  (реклама, превью), может подхватить не тот — точечных исключений
  под конкретные сайты пока нет.
- VK/RuTube идут через тот же общий путь, без нативных плеерных API.
