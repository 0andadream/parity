import type {Metadata} from 'next';
import './globals.css';
import {Header,Footer} from '@/components/primitives';
export const metadata:Metadata={title:{default:'PARITY, PreStocks integrity monitor',template:'%s · PARITY'},description:'Independent onchain observations, sourced issuer evidence, market observations and lifecycle deadlines for PreStocks.',icons:{icon:'/icon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body><a className="skip-link" href="#main">Skip to content</a><Header/><main id="main">{children}</main><Footer/></body></html>;}
