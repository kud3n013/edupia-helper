export const Background = () => {
    return (
        <div
            suppressHydrationWarning
            className="fixed top-0 left-0 w-full h-full -z-10 bg-[#c7d2fe] dark:bg-[#111827] blur-[50px] opacity-60 pointer-events-none transition-colors duration-300"
            style={{
                backgroundImage: 'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.3) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(236, 72, 153, 0.3) 0%, transparent 40%)'
            }}
        />
    );
};
