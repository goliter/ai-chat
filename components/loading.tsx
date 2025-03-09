export function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      <p className="text-white text-lg">正在验证登录状态...</p>
    </div>
  );
}
