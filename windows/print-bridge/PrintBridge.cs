using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Win32.SafeHandles;

public static class UsbPrinter {
    [StructLayout(LayoutKind.Sequential)] struct InterfaceData { public int Size; public Guid Class; public int Flags; public IntPtr Reserved; }
    [DllImport("setupapi.dll", SetLastError=true)] static extern IntPtr SetupDiGetClassDevs(ref Guid guid, IntPtr enumerator, IntPtr parent, uint flags);
    [DllImport("setupapi.dll", SetLastError=true)] static extern bool SetupDiEnumDeviceInterfaces(IntPtr set, IntPtr dev, ref Guid guid, uint index, ref InterfaceData data);
    [DllImport("setupapi.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern bool SetupDiGetDeviceInterfaceDetail(IntPtr set, ref InterfaceData data, IntPtr detail, uint size, out uint required, IntPtr device);
    [DllImport("setupapi.dll")] static extern bool SetupDiDestroyDeviceInfoList(IntPtr set);
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] static extern SafeFileHandle CreateFile(string name,uint access,uint share,IntPtr security,uint creation,uint flags,IntPtr template);
    [DllImport("kernel32.dll", SetLastError=true)] static extern bool WriteFile(SafeFileHandle handle,byte[] buffer,int length,out int written,IntPtr overlapped);
    public static string[] Find() {
        Guid guid=new Guid("28d78fad-5a12-11d1-ae5b-0000f803a8c2");
        IntPtr set=SetupDiGetClassDevs(ref guid,IntPtr.Zero,IntPtr.Zero,18);
        if(set==new IntPtr(-1)) throw new Win32Exception();
        List<string> paths=new List<string>();
        List<string> allUsbPrint=new List<string>();
        try {
            for(uint i=0;;i++) {
                InterfaceData data=new InterfaceData(); data.Size=Marshal.SizeOf(data);
                if(!SetupDiEnumDeviceInterfaces(set,IntPtr.Zero,ref guid,i,ref data)) {
                    if(Marshal.GetLastWin32Error()!=259) throw new Win32Exception();
                    break;
                }
                uint size; SetupDiGetDeviceInterfaceDetail(set,ref data,IntPtr.Zero,0,out size,IntPtr.Zero);
                IntPtr detail=Marshal.AllocHGlobal((int)size);
                try {
                    Marshal.WriteInt32(detail,IntPtr.Size==8?8:6);
                    if(!SetupDiGetDeviceInterfaceDetail(set,ref data,detail,size,out size,IntPtr.Zero)) throw new Win32Exception();
                    string path=Marshal.PtrToStringUni(IntPtr.Add(detail,4));
                    allUsbPrint.Add(path);
                    if(path.ToLowerInvariant().Contains("vid_28e9&pid_0289")) paths.Add(path);
                } finally { Marshal.FreeHGlobal(detail); }
            }
        } finally { SetupDiDestroyDeviceInfoList(set); }
        if(paths.Count>0) return paths.ToArray();
        if(allUsbPrint.Count==1) return allUsbPrint.ToArray();
        return paths.ToArray();
    }
    public static void Check() {
        string[] paths=Find();
        if(paths.Length!=1) throw new Exception(paths.Length==0?"Khong tim thay may in PT210 USB. Hay bat nguon va cam day USB.":"Co nhieu may in USB dang cam. Hay chi cam mot may in de tranh in nham.");
        using(SafeFileHandle h=CreateFile(paths[0],0x40000000,3,IntPtr.Zero,3,0,IntPtr.Zero)) {
            if(h.IsInvalid) throw new Win32Exception(Marshal.GetLastWin32Error());
        }
    }
    public static void Print(byte[] bytes) {
        string[] paths=Find();
        if(paths.Length!=1) throw new Exception(paths.Length==0?"Khong tim thay may in PT210 USB. Hay bat nguon va cam day USB.":"Can dung mot may in PT210 USB dang cam.");
        using(SafeFileHandle h=CreateFile(paths[0],0x40000000,3,IntPtr.Zero,3,0,IntPtr.Zero)) {
            if(h.IsInvalid) throw new Win32Exception(Marshal.GetLastWin32Error());
            int offset=0;
            while(offset<bytes.Length) {
                int size=Math.Min(4096,bytes.Length-offset); byte[] chunk=new byte[size]; Array.Copy(bytes,offset,chunk,0,size);
                int written; if(!WriteFile(h,chunk,size,out written,IntPtr.Zero) || written<=0) throw new Win32Exception(Marshal.GetLastWin32Error());
                offset+=written;
            }
        }
    }
}

static class Program {
    [DllImport("user32.dll", CharSet=CharSet.Unicode)]
    static extern int MessageBoxW(IntPtr owner, string message, string title, uint flags);
    static readonly object approvalLock = new object();
    static readonly object usbLock = new object();
    static readonly object logLock = new object();
    static readonly SemaphoreSlim clients = new SemaphoreSlim(8);
    class Consent { public string Origin; public ManualResetEvent Done=new ManualResetEvent(false); public bool Allowed; }
    static readonly Dictionary<string,Consent> pending = new Dictionary<string,Consent>();
    static JavaScriptSerializer json=new JavaScriptSerializer();
    static string directory=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),"QuanLiHoCau","PrintBridge");
    static Dictionary<string,string> approvals=new Dictionary<string,string>();
    static bool connected=false;
    [STAThread] static void Main(string[] args) {
        Directory.CreateDirectory(directory);
        if(args.Length>0 && (args[0]=="--diagnose" || args[0]=="--test")) {
            try {
                UsbPrinter.Check();
                if(args[0]=="--test") UsbPrinter.Print(Encoding.ASCII.GetBytes("\x1b@\x1b\x61\x01QUAN LI HO CAU\nMP210 / PT210 - USB\n58 mm - ESC/POS\n\x1b\x61\x00KET NOI USB THANH CONG\n"+DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")+"\n\n\n"));
                File.WriteAllText(Path.Combine(directory,"diagnostic.json"),json.Serialize(new {success=true, sent=args[0]=="--test", devices=UsbPrinter.Find()}));
            } catch(Exception e) { File.WriteAllText(Path.Combine(directory,"diagnostic.json"),json.Serialize(new {success=false,error=e.Message})); }
            return;
        }
        string installed=Path.Combine(directory,"QuanLiHoCau-PrintBridge.exe");
        string current=System.Reflection.Assembly.GetExecutingAssembly().Location;
        if(!string.Equals(current,installed,StringComparison.OrdinalIgnoreCase)) {
            try {
                File.Copy(current,installed,true);
                Type shellType=Type.GetTypeFromProgID("WScript.Shell");
                object shell=Activator.CreateInstance(shellType);
                object shortcut=shellType.InvokeMember("CreateShortcut",System.Reflection.BindingFlags.InvokeMethod,null,shell,new object[]{Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Startup),"QuanLiHoCau PrintBridge.lnk")});
                shortcut.GetType().InvokeMember("TargetPath",System.Reflection.BindingFlags.SetProperty,null,shortcut,new object[]{installed});
                shortcut.GetType().InvokeMember("WindowStyle",System.Reflection.BindingFlags.SetProperty,null,shortcut,new object[]{7});
                shortcut.GetType().InvokeMember("Save",System.Reflection.BindingFlags.InvokeMethod,null,shortcut,null);
                Marshal.FinalReleaseComObject(shortcut); Marshal.FinalReleaseComObject(shell);
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(installed){Arguments="--show-setup",UseShellExecute=true,WindowStyle=System.Diagnostics.ProcessWindowStyle.Hidden});
                return;
            } catch(Exception e) {
                MessageBox.Show("Khong cai duoc ho tro in Windows: "+e.Message,"Quan Li Ho Cau");
                return;
            }
        }
        string file=Path.Combine(directory,"approvals.json");
        try { if(File.Exists(file)) approvals=json.Deserialize<Dictionary<string,string>>(File.ReadAllText(file)); } catch { }
        TcpListener listener=new TcpListener(IPAddress.Loopback,17858);
        try { listener.Start(); } catch {
            MessageBoxW(IntPtr.Zero,"Ho tro in cu dang chay. Hay thoat QuanLiHoCau-PrintBridge trong Task Manager roi mo lai ban moi.","Quan Li Ho Cau - Ho tro in",0x00050040);
            return;
        }
        if(args.Length>0 && args[0]=="--show-setup") {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://quanlihocau.com/settings/printer?setup=windows"){UseShellExecute=true});
        }
        while(true) {
            try {
                TcpClient client=listener.AcceptTcpClient();
                if(!clients.Wait(0)) { client.Close(); continue; }
                ThreadPool.QueueUserWorkItem(state => {
                    using(TcpClient workerClient=(TcpClient)state) {
                        workerClient.ReceiveTimeout=10000; workerClient.SendTimeout=10000;
                        try { Serve(workerClient.GetStream(),file); }
                        catch(Exception e) { lock(logLock) File.AppendAllText(Path.Combine(directory,"errors.log"),DateTime.Now.ToString("s")+" "+e.Message+"\n"); }
                        finally { clients.Release(); }
                    }
                }, client);
            } catch { Thread.Sleep(50); }
        }
    }
    static bool ValidOrigin(string origin) {
        Uri uri;
        return Uri.TryCreate(origin,UriKind.Absolute,out uri) && uri.GetLeftPart(UriPartial.Authority)==origin &&
            (uri.Scheme=="https" || (uri.Scheme=="http" && uri.IsLoopback));
    }
    static void Reply(Stream stream,int code,string origin,object value) {
        byte[] body=Encoding.UTF8.GetBytes(new JavaScriptSerializer().Serialize(value));
        string headers="HTTP/1.1 "+code+" Result\r\nContent-Type: application/json; charset=utf-8\r\nConnection: close\r\nContent-Length: "+body.Length+"\r\n";
        if(ValidOrigin(origin)) headers+="Access-Control-Allow-Origin: "+origin+"\r\nVary: Origin\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, X-Print-Token, target-address-space, *\r\nAccess-Control-Allow-Private-Network: true\r\n";
        byte[] head=Encoding.ASCII.GetBytes(headers+"\r\n"); stream.Write(head,0,head.Length); stream.Write(body,0,body.Length);
    }
    static void Html(Stream stream, string content) {
        byte[] body=Encoding.UTF8.GetBytes(content);
        byte[] head=Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nX-Frame-Options: DENY\r\nContent-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'\r\nCache-Control: no-store\r\nConnection: close\r\nContent-Length: "+body.Length+"\r\n\r\n");
        stream.Write(head,0,head.Length); stream.Write(body,0,body.Length);
    }
    static void Serve(Stream stream,string file) {
        // Byte parsing avoids StreamReader buffering beyond the HTTP headers.
        List<byte> header=new List<byte>();
        while(header.Count<16384) {
            int b=stream.ReadByte(); if(b<0) return; header.Add((byte)b);
            int n=header.Count; if(n>=4 && header[n-4]==13 && header[n-3]==10 && header[n-2]==13 && header[n-1]==10) break;
        }
        string[] lines=Encoding.ASCII.GetString(header.ToArray()).Split(new[]{"\r\n"},StringSplitOptions.None);
        string[] request=lines[0].Split(' '); if(request.Length!=3) return;
        lock(logLock) File.AppendAllText(Path.Combine(directory,"requests.log"),DateTime.Now.ToString("s")+" "+request[0]+" "+request[1].Split('?')[0]+"\n");
        Dictionary<string,string> fields=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
        foreach(string line in lines) { int i=line.IndexOf(':'); if(i>0) fields[line.Substring(0,i)]=line.Substring(i+1).Trim(); }
        string origin; fields.TryGetValue("Origin",out origin);
        string host;
        if(!fields.TryGetValue("Host",out host) || (host!="127.0.0.1:17858" && host!="localhost:17858")) { Reply(stream,403,origin,new {error="Invalid host"}); return; }
        if(request[0]=="GET" && request[1].StartsWith("/consent?nonce=")) {
            string nonce=request[1].Substring("/consent?nonce=".Length);
            Consent consent; lock(approvalLock) pending.TryGetValue(nonce,out consent);
            if(consent==null) { Html(stream,"<h2>Yêu cầu đã hết hạn. Hãy bấm kết nối lại trong app.</h2>"); return; }
            Html(stream,"<!doctype html><meta charset='utf-8'><title>Cho phép máy in</title><style>body{font:20px Arial;max-width:650px;margin:60px auto;padding:24px}button{font:inherit;padding:14px;background:#2d6a4f;color:white;border:0;border-radius:8px}</style><h1>Cho phép in vé qua USB</h1><p>Ứng dụng yêu cầu: <strong>"+System.Web.HttpUtility.HtmlEncode(consent.Origin)+"</strong></p><p>Đồng ý để ứng dụng này sử dụng MP210/PT210 trên PC. Những lần sau app sẽ tự nối lại.</p><form method='post' action='/approve'><input type='hidden' name='nonce' value='"+nonce+"'><button type='submit'>Đồng ý kết nối máy in</button></form><p>Đóng trang này nếu bạn không đồng ý.</p>");
            return;
        }
        int length=0; string contentLength;
        byte[] body=new byte[0];
        if(request[0]!="OPTIONS") {
            if(request[0]!="POST" || fields.ContainsKey("Transfer-Encoding") || !fields.TryGetValue("Content-Length",out contentLength) || !int.TryParse(contentLength,out length) || length<0 || length>1048576) { Reply(stream,400,origin,new {error="Invalid request"}); return; }
            body=new byte[length]; int offset=0;
            while(offset<length) { int read=stream.Read(body,offset,length-offset); if(read==0) return; offset+=read; }
        }
        if(request[1]=="/approve") {
            if(origin!="http://127.0.0.1:17858" && origin!="http://localhost:17858") { Reply(stream,403,origin,new {error="Local consent required"}); return; }
            string form=Encoding.UTF8.GetString(body);
            string nonce=form.StartsWith("nonce=")?Uri.UnescapeDataString(form.Substring(6)):"";
            Consent consent;
            lock(approvalLock) {
                if(!pending.TryGetValue(nonce,out consent)) { Html(stream,"<h2>Yêu cầu đã hết hạn.</h2>"); return; }
                byte[] random=new byte[32]; using(var rng=RandomNumberGenerator.Create()) rng.GetBytes(random);
                approvals[consent.Origin]=Convert.ToBase64String(random);
                File.WriteAllText(file,json.Serialize(approvals));
                consent.Allowed=true; consent.Done.Set();
            }
            Html(stream,"<meta charset='utf-8'><h1>Đã đồng ý kết nối máy in</h1><p>Quay lại quanlihocau.com. App đang hoàn tất kết nối.</p>"); return;
        }
        if(!ValidOrigin(origin)) { Reply(stream,403,origin,new {error="Origin required"}); return; }
        if(request[0]=="OPTIONS") { Reply(stream,200,origin,new {success=true}); return; }
        try {
            if(request[1]=="/health") { Reply(stream,200,origin,new {success=true,version="2",permissionRequired=false}); return; }
            if(request[1]=="/pair") {
                lock(approvalLock) {
                    if(!approvals.ContainsKey(origin)) {
                        byte[] random=new byte[32]; using(var rng=RandomNumberGenerator.Create()) rng.GetBytes(random);
                        approvals[origin]=Convert.ToBase64String(random);
                        try { File.WriteAllText(file,json.Serialize(approvals)); } catch {}
                    }
                    Reply(stream,200,origin,new {token=approvals[origin]});
                }
                return;
            }
            string token;
            if(!approvals.ContainsKey(origin) || !fields.TryGetValue("X-Print-Token",out token) || token!=approvals[origin]) { Reply(stream,403,origin,new {error="Can cho phep ket noi may in lai."}); return; }
            if(request[1]=="/devices") {
                string[] paths=UsbPrinter.Find();
                object[] devices=paths.Length==1?new object[]{new {id="windows-usb:28e9:0289",address="windows-usb",name="Máy in PT210 / MP210 (USB)",connectionType="USB",vendorId=10473,productId=649}}:new object[0];
                Reply(stream,200,origin,new {devices=devices});
            } else if(request[1]=="/connect") { UsbPrinter.Check(); connected=true; Reply(stream,200,origin,new {success=true}); }
            else if(request[1]=="/status") { bool active=connected && UsbPrinter.Find().Length==1; Reply(stream,200,origin,new {isConnected=active,status=active?"connected":"disconnected"}); }
            else if(request[1]=="/disconnect") { connected=false; Reply(stream,200,origin,new {success=true}); }
            else if(request[1]=="/print") {
                if(!connected) throw new Exception("Chua ket noi may in USB.");
                var payload=json.Deserialize<Dictionary<string,string>>(Encoding.UTF8.GetString(body));
                byte[] bytes=Convert.FromBase64String(payload["data"]); if(bytes.Length==0 || bytes.Length>524288) throw new Exception("Du lieu in khong hop le.");
                lock(usbLock) UsbPrinter.Print(bytes); Reply(stream,200,origin,new {success=true});
            } else Reply(stream,404,origin,new {error="Not found"});
        } catch(Exception e) { connected=false; Reply(stream,500,origin,new {error=e.Message}); }
    }
}
