#include <stdint.h>
#include <stddef.h>
#include <Mayaqua/Mayaqua.h>

int LLVMFuzzerInitialize(int *argc, char ***argv)
{
    MayaquaMinimalMode();
    InitMayaqua(false, false, 0, NULL);
    return 0;
}

static void parse_cert(const uint8_t *data, size_t size, bool text)
{
    BUF *b = NewBuf();
    X *x;

    WriteBuf(b, (void *)data, (UINT)size);
    SeekBufToBegin(b);
    x = BufToX(b, text);
    FreeBuf(b);

    if (x != NULL)
    {
        BUF *out = XToBuf(x, text);
        K *k = GetKFromX(x);
        (void)CheckXDateNow(x);
        if (k != NULL)
            FreeK(k);
        if (out != NULL)
            FreeBuf(out);
        FreeX(x);
    }
}

int LLVMFuzzerTestOneInput(const uint8_t *data, size_t size)
{
    if (data == NULL || size == 0 || size > (512U * 1024U))
        return 0;

    parse_cert(data, size, false);
    parse_cert(data, size, true);
    return 0;
}
