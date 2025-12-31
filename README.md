# 🇻🇳 MCSR Ranked Vietnam Leaderboard

Bảng xếp hạng **Minecraft Speedrun Ranked (MCSR)** dành riêng cho **người chơi Việt Nam**.  
Dữ liệu được lấy trực tiếp từ **MCSR Ranked API**, hiển thị theo thời gian thực.

🌐 Demo: https://your-project.vercel.app

---

## ✨ Tính năng

- 🏆 Bảng xếp hạng người chơi MCSR Việt Nam
- 🔍 Tìm kiếm theo nickname
- 📊 Sắp xếp theo:
  - ELO
  - Best Time
  - Average Time
  - Wins / Loses
  - Win Rate
- 🎮 Hiển thị avatar Minecraft (Crafatar)
- 📱 Giao diện đẹp, responsive, phong cách Minecraft
- ⚡ Deploy nhanh bằng Vercel

---

## 🛠 Công nghệ sử dụng

- **Next.js 14** (App Router)
- **React 18**
- **Tailwind CSS**
- **Lucide React Icons**
- **MCSR Ranked API**
- **Vercel Hosting**

---

## 📁 Cấu trúc thư mục

```txt
app/
 ├─ page.jsx        # Trang leaderboard chính
 ├─ layout.jsx      # Layout bắt buộc của Next.js
 ├─ globals.css     # Tailwind CSS
tailwind.config.js
postcss.config.js
package.json
vercel.json
README.md
