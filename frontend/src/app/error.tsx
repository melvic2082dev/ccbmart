'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center p-8">
        <h2 className="text-xl font-bold mb-4">Đã xảy ra lỗi</h2>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <button onClick={reset} className="px-4 py-2 bg-blue-600 text-white rounded">Thử lại</button>
      </div>
    </div>
  );
}
