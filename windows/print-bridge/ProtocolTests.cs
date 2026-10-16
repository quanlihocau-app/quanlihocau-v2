using System;
using System.IO;
using System.Text;
using System.Reflection;
class ProtocolTests {
    static int Main(string[] args) {
        Assembly assembly=Assembly.LoadFile(Path.GetFullPath(args[0]));
        MethodInfo serve=assembly.GetType("Program").GetMethod("Serve",BindingFlags.NonPublic|BindingFlags.Static);
        string[] paths={"/health","/devices","/health","/approve"};
        string[] origins={"https://fixture.test","https://fixture.test","http://unsafe.test","https://fixture.test"};
        int[] codes={200,403,403,403};
        for(int i=0;i<paths.Length;i++) {
            string request="POST "+paths[i]+" HTTP/1.1\r\nHost: 127.0.0.1:17858\r\nOrigin: "+origins[i]+"\r\nContent-Length: 2\r\n\r\n{}";
            byte[] bytes=Encoding.ASCII.GetBytes(request);
            using(MemoryStream stream=new MemoryStream()) {
                stream.Write(bytes,0,bytes.Length); stream.Position=0;
                serve.Invoke(null,new object[]{stream,Path.Combine(Path.GetTempPath(),"unused-printbridge-fixture.json")});
                string response=Encoding.UTF8.GetString(stream.ToArray()).Substring(bytes.Length);
                if(!response.StartsWith("HTTP/1.1 "+codes[i])) throw new Exception("Protocol failed: "+paths[i]);
                Console.WriteLine("PASS "+paths[i]+": "+codes[i]);
            }
        }
        return 0;
    }
}
