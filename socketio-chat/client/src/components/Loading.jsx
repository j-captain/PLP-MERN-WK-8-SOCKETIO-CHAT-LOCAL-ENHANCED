export default function Loading({ message = "Loading..." }) {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="sr-only">Loading...</span>
        </div>
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
}