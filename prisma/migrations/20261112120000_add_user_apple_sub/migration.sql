-- Thêm mã người dùng Apple. Cột để trống với tài khoản cũ. Không sửa dòng hiện có.
ALTER TABLE "User" ADD COLUMN "appleSub" TEXT;

CREATE UNIQUE INDEX "User_appleSub_key" ON "User"("appleSub");
