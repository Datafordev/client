// Auto-generated by avdl-compiler v1.3.6 (https://github.com/keybase/node-avdl-compiler)
//   Input file: avdl/keybase1/fs.avdl

package keybase1

import (
	rpc "github.com/keybase/go-framed-msgpack-rpc"
	context "golang.org/x/net/context"
)

type File struct {
	Path string `codec:"path" json:"path"`
}

type ListResult struct {
	Files []File `codec:"files" json:"files"`
}

type ListArg struct {
	SessionID int    `codec:"sessionID" json:"sessionID"`
	Path      string `codec:"path" json:"path"`
}

type FsInterface interface {
	// List files in a path. Implemented by KBFS service.
	List(context.Context, ListArg) (ListResult, error)
}

func FsProtocol(i FsInterface) rpc.Protocol {
	return rpc.Protocol{
		Name: "keybase.1.fs",
		Methods: map[string]rpc.ServeHandlerDescription{
			"List": {
				MakeArg: func() interface{} {
					ret := make([]ListArg, 1)
					return &ret
				},
				Handler: func(ctx context.Context, args interface{}) (ret interface{}, err error) {
					typedArgs, ok := args.(*[]ListArg)
					if !ok {
						err = rpc.NewTypeError((*[]ListArg)(nil), args)
						return
					}
					ret, err = i.List(ctx, (*typedArgs)[0])
					return
				},
				MethodType: rpc.MethodCall,
			},
		},
	}
}

type FsClient struct {
	Cli rpc.GenericClient
}

// List files in a path. Implemented by KBFS service.
func (c FsClient) List(ctx context.Context, __arg ListArg) (res ListResult, err error) {
	err = c.Cli.Call(ctx, "keybase.1.fs.List", []interface{}{__arg}, &res)
	return
}
