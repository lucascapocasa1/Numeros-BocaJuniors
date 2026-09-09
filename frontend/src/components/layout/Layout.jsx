import Navbar from './Navbar';
import Footer from './Footer';
import InstallBanner from '../common/InstallBanner';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <InstallBanner />
    </div>
  );
}
