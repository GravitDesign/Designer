<#
.SYNOPSIS
  Asks the Gravit Designer thumbnail handler DLL (native/gvthumb) for the
  thumbnail of one .gvdesign file, the way Explorer would, without
  registering the DLL anywhere.

.DESCRIPTION
  Loads the DLL with LoadLibrary, calls its DllGetClassObject for the
  handler's CLSID, creates the provider through IClassFactory, hands it an
  IStream over the file (IInitializeWithStream.Initialize) and calls
  IThumbnailProvider.GetThumbnail(Size). The HBITMAP's 32-bit pixels are
  copied unchanged (top-down BGRA, as the DLL wrote them) into a PNG.

  Prints one line of JSON:
    {"getClassObject":"0x00000000","createInstance":"0x00000000",
     "initialize":"0x00000000","getThumbnail":"0x00000000",
     "alpha":2,"width":256,"height":171,"bitsPerPixel":32}
  HRESULTs are hex strings. alpha, width and height are only present when
  GetThumbnail succeeded; the PNG is only written then.

.EXAMPLE
  powershell -NoProfile -STA -ExecutionPolicy Bypass -File gvthumb.ps1 `
    -File drawing.gvdesign -Out drawing.png
#>
param(
  [Parameter(Mandatory = $true)][string]$File,
  [string]$Out = "",
  [int]$Size = 256,
  # Path of GravitThumbnail.dll. Default: this folder's build (see build.ps1),
  # then native/gvthumb/build/Release in this checkout.
  [string]$Dll = ""
)

$ErrorActionPreference = "Stop"

if (-not $Dll) {
  $candidates = @(
    (Join-Path $PSScriptRoot "build\Release\GravitThumbnail.dll"),
    (Join-Path $PSScriptRoot "..\..\..\..\native\gvthumb\build\Release\GravitThumbnail.dll")
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { $Dll = (Resolve-Path $c).Path; break }
  }
  if (-not $Dll) { throw "GravitThumbnail.dll not found; run build.ps1 or pass -Dll" }
}

$source = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.Runtime.InteropServices.ComTypes;

public static class GvThumbProbe {
    [ComImport, Guid("00000001-0000-0000-C000-000000000046"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IClassFactory {
        [PreserveSig] int CreateInstance(IntPtr outer, ref Guid riid, out IntPtr ppv);
        [PreserveSig] int LockServer(bool fLock);
    }

    [ComImport, Guid("b824b49d-22ac-4161-ac8a-9916e8fa3f7f"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IInitializeWithStream {
        [PreserveSig] int Initialize(IStream stream, uint grfMode);
    }

    [ComImport, Guid("e357fccd-a995-4576-b01f-234630154e96"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    interface IThumbnailProvider {
        [PreserveSig] int GetThumbnail(uint cx, out IntPtr hbmp, out int alpha);
    }

    [UnmanagedFunctionPointer(CallingConvention.StdCall)]
    delegate int DllGetClassObjectFn(ref Guid clsid, ref Guid iid, out IntPtr ppv);

    [StructLayout(LayoutKind.Sequential)]
    struct BITMAP {
        public int bmType, bmWidth, bmHeight, bmWidthBytes;
        public ushort bmPlanes, bmBitsPixel;
        public IntPtr bmBits;
    }

    [DllImport("kernel32", SetLastError = true, CharSet = CharSet.Unicode)]
    static extern IntPtr LoadLibraryW(string path);
    [DllImport("kernel32", SetLastError = true, CharSet = CharSet.Ansi)]
    static extern IntPtr GetProcAddress(IntPtr module, string name);
    [DllImport("shlwapi", CharSet = CharSet.Unicode, PreserveSig = false)]
    static extern IStream SHCreateStreamOnFileEx(string file, uint mode, uint attributes,
        bool create, IntPtr template);
    [DllImport("gdi32")]
    static extern int GetObject(IntPtr h, int size, out BITMAP bmp);
    [DllImport("gdi32")]
    static extern bool DeleteObject(IntPtr h);

    static string Hex(int hr) { return "0x" + hr.ToString("X8"); }

    public static string Run(string dll, string file, string outPng, int size) {
        IntPtr module = LoadLibraryW(dll);
        if (module == IntPtr.Zero)
            throw new Exception("LoadLibrary failed: " + Marshal.GetLastWin32Error());
        IntPtr proc = GetProcAddress(module, "DllGetClassObject");
        if (proc == IntPtr.Zero) throw new Exception("DllGetClassObject not exported");
        var getClassObject = (DllGetClassObjectFn)Marshal.GetDelegateForFunctionPointer(
            proc, typeof(DllGetClassObjectFn));

        Guid clsid = new Guid("9350F9C2-8A3E-4325-8A0A-49DF202A4666");
        Guid iidFactory = typeof(IClassFactory).GUID;
        Guid iidUnknown = new Guid("00000000-0000-0000-C000-000000000046");
        string json = "{";
        IntPtr pFactory;
        int hr = getClassObject(ref clsid, ref iidFactory, out pFactory);
        json += "\"getClassObject\":\"" + Hex(hr) + "\"";
        if (hr != 0) return json + "}";
        var factory = (IClassFactory)Marshal.GetObjectForIUnknown(pFactory);
        Marshal.Release(pFactory);

        IntPtr pObj;
        hr = factory.CreateInstance(IntPtr.Zero, ref iidUnknown, out pObj);
        json += ",\"createInstance\":\"" + Hex(hr) + "\"";
        if (hr != 0) return json + "}";
        object provider = Marshal.GetObjectForIUnknown(pObj);
        Marshal.Release(pObj);

        // STGM_READ | STGM_SHARE_DENY_WRITE, the way Explorer opens files.
        IStream stream = SHCreateStreamOnFileEx(file, 0x20, 0, false, IntPtr.Zero);
        hr = ((IInitializeWithStream)provider).Initialize(stream, 0);
        json += ",\"initialize\":\"" + Hex(hr) + "\"";
        if (hr != 0) return json + "}";

        IntPtr hbmp;
        int alpha;
        hr = ((IThumbnailProvider)provider).GetThumbnail((uint)size, out hbmp, out alpha);
        json += ",\"getThumbnail\":\"" + Hex(hr) + "\"";
        if (hr != 0 || hbmp == IntPtr.Zero) return json + "}";

        BITMAP bm;
        GetObject(hbmp, Marshal.SizeOf(typeof(BITMAP)), out bm);
        int w = bm.bmWidth, h = Math.Abs(bm.bmHeight);
        json += ",\"alpha\":" + alpha + ",\"width\":" + w + ",\"height\":" + h +
                ",\"bitsPerPixel\":" + bm.bmBitsPixel;
        if (bm.bmBitsPixel == 32 && bm.bmBits != IntPtr.Zero && outPng.Length > 0) {
            // The DLL makes a top-down 32bpp DIB section. Copy its bytes as
            // they are; Format32bppArgb has the same BGRA memory layout.
            byte[] bits = new byte[bm.bmWidthBytes * h];
            Marshal.Copy(bm.bmBits, bits, 0, bits.Length);
            using (var bmp = new Bitmap(w, h, PixelFormat.Format32bppArgb)) {
                var data = bmp.LockBits(new Rectangle(0, 0, w, h), ImageLockMode.WriteOnly,
                    PixelFormat.Format32bppArgb);
                for (int y = 0; y < h; y++) {
                    // bmHeight < 0 would mean top-down in BITMAPINFO, but GetObject
                    // always reports a positive height; the DLL's DIB is top-down.
                    Marshal.Copy(bits, y * bm.bmWidthBytes,
                        new IntPtr(data.Scan0.ToInt64() + (long)y * data.Stride), w * 4);
                }
                bmp.UnlockBits(data);
                bmp.Save(outPng, ImageFormat.Png);
            }
        }
        DeleteObject(hbmp);
        Marshal.ReleaseComObject(stream);
        Marshal.ReleaseComObject(provider);
        Marshal.ReleaseComObject(factory);
        return json + "}";
    }
}
"@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing
$outPath = ""
if ($Out) { $outPath = [System.IO.Path]::GetFullPath($Out) }
$filePath = (Resolve-Path $File).Path
[Console]::Out.WriteLine([GvThumbProbe]::Run($Dll, $filePath, $outPath, $Size))
