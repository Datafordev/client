// Auto-generated by avdl-compiler v1.3.6 (https://github.com/keybase/node-avdl-compiler)
//   Input file: avdl/keybase1/scanproofs.avdl

package keybase1

import (
	rpc "github.com/keybase/go-framed-msgpack-rpc"
	context "golang.org/x/net/context"
)

type ScanProofsArg struct {
	SessionID  int    `codec:"sessionID" json:"sessionID"`
	Infile     string `codec:"infile" json:"infile"`
	Indices    string `codec:"indices" json:"indices"`
	Sigid      string `codec:"sigid" json:"sigid"`
	Ratelimit  int    `codec:"ratelimit" json:"ratelimit"`
	Cachefile  string `codec:"cachefile" json:"cachefile"`
	Ignorefile string `codec:"ignorefile" json:"ignorefile"`
}

type ScanProofsInterface interface {
	ScanProofs(context.Context, ScanProofsArg) error
}

func ScanProofsProtocol(i ScanProofsInterface) rpc.Protocol {
	return rpc.Protocol{
		Name: "keybase.1.ScanProofs",
		Methods: map[string]rpc.ServeHandlerDescription{
			"scanProofs": {
				MakeArg: func() interface{} {
					ret := make([]ScanProofsArg, 1)
					return &ret
				},
				Handler: func(ctx context.Context, args interface{}) (ret interface{}, err error) {
					typedArgs, ok := args.(*[]ScanProofsArg)
					if !ok {
						err = rpc.NewTypeError((*[]ScanProofsArg)(nil), args)
						return
					}
					err = i.ScanProofs(ctx, (*typedArgs)[0])
					return
				},
				MethodType: rpc.MethodCall,
			},
		},
	}
}

type ScanProofsClient struct {
	Cli rpc.GenericClient
}

func (c ScanProofsClient) ScanProofs(ctx context.Context, __arg ScanProofsArg) (err error) {
	err = c.Cli.Call(ctx, "keybase.1.ScanProofs.scanProofs", []interface{}{__arg}, nil)
	return
}
