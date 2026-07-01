# HƯỚNG DẪN TRIỂN KHAI ỨNG DỤNG LÊN INTERNET (NETLIFY & RENDER)

Tài liệu này hướng dẫn bạn cách đưa ứng dụng **Quản lý KPI Phòng Quy chế CPC1 Hà Nội** lên môi trường online để tất cả nhân viên có thể truy cập qua internet. Các quy định bảo mật và yêu cầu đăng nhập vẫn được giữ nguyên 100% nhờ cơ chế xác thực JWT và mã hóa mật khẩu ở Backend.

---

## BƯỚC 1: ĐƯA MÃ NGUỒN LÊN GITHUB

Trước khi deploy, bạn cần đẩy dự án này lên một kho chứa mã nguồn cá nhân trên **GitHub** (hoặc GitLab):

1. Tạo một repository mới trên GitHub (ví dụ đặt tên: `regulatory-affairs-cpc1hn`).
2. Mở terminal tại thư mục gốc của dự án và chạy các lệnh:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for production deployment"
   git branch -M main
   git remote add origin https://github.com/TÊN_TÀI_KHOẢN_CỦA_BẠN/regulatory-affairs-cpc1hn.git
   git push -u origin main
   ```

---

## BƯỚC 2: DEPLOY BACKEND (SERVER API) LÊN RENDER

Vì Backend quản lý dữ liệu (các file JSON lưu tài khoản và KPI) và kết nối với Gemini AI, chúng ta cần deploy Backend trước để lấy địa chỉ URL API.

### Phương án đề xuất: Deploy lên Render (Có ổ đĩa ngoài Disk để không mất dữ liệu)
Render cung cấp tính năng **Disk (ổ cứng lưu trữ lâu dài)**. Nếu dùng Disk, dữ liệu của bạn sẽ không bị mất khi máy chủ restart hoặc sleep.

1. Đăng nhập vào [Render.com](https://render.com/).
2. Chọn **New +** -> **Web Service**.
3. Kết nối với tài khoản GitHub của bạn và chọn repository `regulatory-affairs-cpc1hn`.
4. Điền cấu hình Web Service như sau:
   - **Name**: `regulatory-affairs-cpc1hn-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Chọn gói **Starter** (hoặc gói có Disk để lưu file JSON dữ liệu không bị xóa khi server restart).
5. Cuộn xuống phần **Advanced** -> Click **Add Disk**:
   - **Name**: `db-disk`
   - **Mount Path**: `/opt/render/project/src/backend/data` *(Chúng ta sẽ map thư mục lưu file JSON vào ổ đĩa này)*
6. Thêm các biến môi trường (**Environment Variables**):
   - `PORT` = `5000`
   - `GEMINI_API_KEY` = `KHÓA_API_GEMINI_CỦA_BẠN` (dành cho RAG Chatbot)
   - `DATA_DIR` = `/opt/render/project/src/backend/data` *(Đường dẫn trỏ vào Disk để server lưu file)*
7. Bấm **Deploy Web Service**. Sau khi deploy xong, Render sẽ cấp cho bạn một đường dẫn API dạng:
   `https://regulatory-affairs-cpc1hn-api.onrender.com`

---

## BƯỚC 3: DEPLOY FRONTEND LÊN NETLIFY

Sau khi có URL của Backend từ Render, chúng ta tiến hành deploy giao diện lên Netlify.

1. Đăng nhập vào [Netlify.com](https://www.netlify.com/).
2. Chọn **Add new site** -> **Import from Git**.
3. Chọn **GitHub** và chọn repository `regulatory-affairs-cpc1hn`.
4. Cấu hình các thông số build:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Click **Add environment variables** để cấu hình URL kết nối với Backend:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://regulatory-affairs-cpc1hn-api.onrender.com` *(Nhập URL Backend bạn đã lấy ở Bước 2)*
6. Bấm **Deploy regulatory-affairs-cpc1hn**.
7. Thay đổi tên đường dẫn trang web:
   - Sau khi deploy xong, vào mục **Site settings** -> **Change site name**.
   - Đổi tên thành: `regulatoryaffairscpc1hn` để có liên kết:
     👉 **`https://regulatoryaffairscpc1hn.netlify.app`**

---

## BẢO MẬT & ĐĂNG NHẬP

- **Đăng nhập bắt buộc**: Tất cả các API lưu thông tin KPI, kế hoạch, duyệt báo cáo và chatbot đều yêu cầu token xác thực JWT (truyền trong header `Authorization: Bearer <token>`). Nếu không đăng nhập hoặc đăng nhập bằng tài khoản không hợp lệ, hệ thống sẽ trả về lỗi `401 Unauthorized` và tự động đá người dùng về trang đăng nhập.
- **Mã hóa mật khẩu**: Tất cả mật khẩu người dùng đều được mã hóa bằng chuẩn `bcrypt` trước khi lưu vào cơ sở dữ liệu.
