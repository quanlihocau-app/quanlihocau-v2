// src/lib/errorMessages.ts
/**
 * Utility to convert internal error codes / situations into friendly Vietnamese messages
 * that can be shown directly to end‑users.
 */
export function friendlyMessage(error: string, detail?: string): string {
  switch (error) {
    case "UNAUTHENTICATED":
      return "Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.";
    case "FORBIDDEN":
      return "Bạn không có quyền thực hiện thao tác này.";
    case "LAKE_ALREADY_HAS_OWNER":
      return "Hồ này đã có chủ. Không thể chỉ định người khác làm chủ hồ này.";
    case "USER_NOT_FOUND":
      return "Không tìm thấy tài khoản người dùng. Vui lòng kiểm tra email đã nhập.";
    case "INVALID_ROLE":
      return "Vai trò được chỉ định không hợp lệ. Vui lòng chọn Chủ hồ, Quản lý hoặc Nhân viên.";
    case "NO_LAKE_MEMBERSHIP":
      return "Bạn chưa được gán quyền vào bất kỳ hồ nào. Vui lòng liên hệ quản trị viên.";
    case "OWNER_REQUIRED":
      return "Chỉ chủ hồ mới có thể thực hiện thao tác này. Vui lòng đăng nhập bằng tài khoản chủ hồ.";
    default:
      // If a custom detail is supplied, append it for more context
      return detail ?? "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.";
  }
}

