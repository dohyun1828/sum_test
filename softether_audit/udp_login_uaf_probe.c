#include <stdio.h>
#include <stdlib.h>
#include <wchar.h>
#include <Mayaqua/Mayaqua.h>
#include <Cedar/Cedar.h>
#include <Cedar/Protocol.h>

int main(int argc, char **argv)
{
    SOCK *s = NULL;
    PACK *p = NULL;
    UINT port = 443;
    int rc = 1;

    if (argc >= 2)
    {
        port = (UINT)strtoul(argv[1], NULL, 10);
    }

    MayaquaMinimalMode();
    InitMayaqua(false, false, argc, argv);
    InitCedar();

    s = TcpIpConnect("127.0.0.1", port, true, false);
    if (s == NULL)
    {
        fprintf(stderr, "connect failed\n");
        goto cleanup;
    }

    if (ClientUploadSignature(s) == false)
    {
        fprintf(stderr, "signature upload failed\n");
        goto cleanup;
    }

    p = HttpClientRecv(s);
    if (p == NULL)
    {
        fprintf(stderr, "hello receive failed\n");
        goto cleanup;
    }
    FreePack(p);
    p = NULL;

    p = NewPack();
    PackAddStr(p, "method", "login");
    PackAddStr(p, "hubname", "NO_SUCH_HUB_FOR_PREAUTH_TEST");
    PackAddStr(p, "username", "unauthenticated");
    PackAddStr(p, "hello", "SoftEther VPN Client");
    PackAddStr(p, "client_str", "SoftEther VPN Client");
    PackAddInt(p, "client_ver", 434);
    PackAddInt(p, "client_build", 9745);
    PackAddInt(p, "protocol", CONNECTION_UDP);
    PackAddInt(p, "authtype", CLIENT_AUTHTYPE_ANONYMOUS);

    if (HttpClientSend(s, p) == false)
    {
        fprintf(stderr, "login send failed\n");
        goto cleanup;
    }
    FreePack(p);
    p = NULL;

    p = HttpClientRecv(s);
    if (p != NULL)
    {
        fprintf(stdout, "server_error=%u\n", GetErrorFromPack(p));
        FreePack(p);
        p = NULL;
    }

    rc = 0;

cleanup:
    if (p != NULL)
    {
        FreePack(p);
    }
    if (s != NULL)
    {
        Disconnect(s);
        ReleaseSock(s);
    }
    FreeCedar();
    FreeMayaqua();
    return rc;
}
