#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <Mayaqua/Mayaqua.h>
#include <Cedar/Cedar.h>

static void save_pack(const char *path, PACK *p)
{
    BUF *b = PackToBuf(p);
    FILE *f;
    if (b == NULL)
        return;
    f = fopen(path, "wb");
    if (f != NULL)
    {
        fwrite(b->Buf, 1, b->Size, f);
        fclose(f);
    }
    FreeBuf(b);
}

static PACK *base(const char *method)
{
    PACK *p = NewPack();
    PackAddStr(p, "method", (char *)method);
    PackAddStr(p, "client_str", "SoftEther VPN Client");
    PackAddInt(p, "client_ver", 434);
    PackAddInt(p, "client_build", 9745);
    return p;
}

int main(void)
{
    PACK *p;
    UCHAR z20[20] = {0};
    UCHAR z16[16] = {0};
    mkdir("corpus", 0700);
    mkdir("corpus/pack", 0700);

    MayaquaMinimalMode();
    InitMayaqua(false, false, 0, NULL);
    InitCedar();

    p = base("enum_hub");
    save_pack("corpus/pack/enum_hub", p);
    FreePack(p);

    p = base("login");
    PackAddStr(p, "hubname", "DEFAULT");
    PackAddStr(p, "username", "user");
    PackAddStr(p, "hello", "SoftEther VPN Client");
    PackAddInt(p, "protocol", 0);
    PackAddInt(p, "authtype", 1);
    PackAddData(p, "secure_password", z20, sizeof(z20));
    PackAddData(p, "unique_id", z20, sizeof(z20));
    save_pack("corpus/pack/login_password", p);
    FreePack(p);

    p = base("login");
    PackAddStr(p, "hubname", "DEFAULT");
    PackAddStr(p, "username", "user");
    PackAddInt(p, "protocol", 0);
    PackAddInt(p, "authtype", 99);
    PackAddData(p, "ticket", z20, sizeof(z20));
    save_pack("corpus/pack/login_ticket", p);
    FreePack(p);

    p = base("additional_connect");
    PackAddData(p, "session_key", z20, sizeof(z20));
    PackAddInt(p, "session_key_32", 0);
    save_pack("corpus/pack/additional", p);
    FreePack(p);

    p = base("admin");
    PackAddStr(p, "hubname", "");
    PackAddData(p, "secure_password", z20, sizeof(z20));
    save_pack("corpus/pack/admin", p);
    FreePack(p);

    p = base("password");
    PackAddStr(p, "hubname", "DEFAULT");
    PackAddStr(p, "username", "user");
    PackAddData(p, "secure_old_password", z20, sizeof(z20));
    PackAddData(p, "new_password", z20, sizeof(z20));
    PackAddData(p, "new_password_ntlm", z16, sizeof(z16));
    save_pack("corpus/pack/password", p);
    FreePack(p);

    p = base("farm_connect");
    PackAddData(p, "SecurePassword", z20, sizeof(z20));
    PackAddStr(p, "HostName", "member");
    PackAddInt(p, "PublicIp", 0);
    PackAddInt(p, "PublicPort", 443);
    save_pack("corpus/pack/farm_connect", p);
    FreePack(p);

    FreeCedar();
    FreeMayaqua();
    return 0;
}
