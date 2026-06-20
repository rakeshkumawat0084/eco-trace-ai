import { Footer } from '@/components/ui/footer-section';

export default function DemoOne() {
	return (
		<div className="relative flex min-h-svh flex-col">
			<div className="min-h-screen flex items-center justify-center">
				<h1 className='font-mono text-2xl font-bold'>Scroll Down!</h1>
			</div>
			<Footer />
		</div>
	);
}
